# Sophie AI Voice Mode Architecture

This document describes the working architecture for real-time voice conversations with Gemini Live API. **Do not change this architecture without understanding the critical design decisions.**

## Overview

Sophie AI uses Gemini Live API for real-time voice conversations. The app first asks Supabase for a short-lived Gemini Live token, then the user speaks directly to Gemini over WebSocket. Audio is not proxied through Supabase.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Microphone  │────▶│  WebSocket   │────▶│  Gemini Live    │
│ (recorder)  │     │  (websocket) │     │  API            │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │                      │
                           │                      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Speaker    │◀────│  Streamer    │◀────│  Audio Response │
│  (device)   │     │  (streamer)  │     │  (PCM chunks)   │
└─────────────┘     └──────────────┘     └─────────────────┘
```

## Push-to-Talk (PTT) Mode

### User Flow

1. **User visits Talk page** → Selects target and native languages
2. **App requests token** → `get-gemini-session` returns a short-lived Gemini Live token
3. **WebSocket connects** → Sophie AI **automatically greets** with hello word introduction
4. **User holds mic button (200ms+)** → Recording starts, audio streams to Gemini
5. **User releases mic** → Recording stops, Gemini processes and Sophie AI responds
6. **Flow continues** → User can hold again to speak

### Key Implementation Details

**Auto-Greeting on Setup Complete** (`services/gemini/websocket.ts:314-324`)

```typescript
if (isSetupCompleteReceived) {
  this.isSetupComplete = true;
  this.setConnectionState("connected");

  // Auto-greet on first connection
  if (!store.hasGreeted) {
    this.sendGreeting();
    store.setHasGreeted(true);
  }
}
```

**Timer-Based Hold Detection** (`app/(tabs)/_layout.tsx`)

- Uses 200ms threshold to distinguish tap from hold
- `onPressIn` starts a timer, recording only begins after threshold
- Quick taps show tooltip: "Hold to Speak"
- `onPressOut` clears timer and stops recording if active

```typescript
const HOLD_THRESHOLD = 200; // milliseconds
const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
const isHoldingRef = useRef(false);

// onPressIn: Start timer, only record if held 200ms+
// onPressOut: Clear timer, stop recording if was holding
// onPress: Show tooltip if tap (not hold)
```

**DO NOT:**

- Trigger greeting on button press (it's auto on setup)
- Start recording immediately on `onPressIn` (use timer)
- Remove the hold threshold (prevents accidental recordings)

## Critical Design Decisions

### 1. Continuous Audio Streaming (DO NOT PAUSE)

**The microphone MUST stream continuously** - even while Sophie AI is speaking.

**Why:**

- Gemini's automatic VAD (Voice Activity Detection) handles turn detection
- Pausing audio breaks VAD's ability to detect user speech
- Sending `activityStart`/`activityEnd` signals is INCOMPATIBLE with automatic VAD
- Error if you try: `Code: 1007, Reason: Explicit activity control is not supported when automatic activity detection is enabled`

**What happens if you pause:**

- User speech after Sophie AI finishes will NOT be detected
- WebSocket may disconnect with error 1007

### 2. Hardware Echo Cancellation (AEC)

**iOS audio session must be configured for voice chat** before creating any AudioContext.

```typescript
AudioManager.setAudioSessionOptions({
  iosCategory: "playAndRecord",
  iosMode: "voiceChat",
  iosOptions: ["defaultToSpeaker", "allowBluetooth"],
});
```

**Why:**

- `iosMode: 'voiceChat'` enables hardware-level echo cancellation
- Without this, the microphone picks up Sophie AI's voice from the speaker
- This would confuse Gemini's VAD into thinking the user is speaking

### 3. Automatic VAD Configuration

The setup message configures Gemini's automatic VAD:

```typescript
realtimeInputConfig: {
    automaticActivityDetection: {
        endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
        silenceDurationMs: 300
    }
}
```

**Settings:**

- `END_SENSITIVITY_LOW`: Less aggressive end-of-speech detection (user can pause briefly)
- `silenceDurationMs: 300`: Wait 300ms of silence before considering speech ended

**DO NOT:**

- Set `disabled: true` (requires manual activity signals)
- Send `activityStart` or `activityEnd` messages
- Try to manually control turn-taking

### 4. Audio Buffer Queue for Gapless Playback

Uses `AudioBufferQueueSourceNode` from `react-native-audio-api` for smooth audio playback.

```typescript
this.queueSource = this.audioContext.createBufferQueueSource();
this.queueSource.connect(this.audioContext.destination);
this.queueSource.onEnded = (event) => {
  if (event.isLast && this.isGenerationComplete) {
    this.finishSpeaking();
  }
};
```

**Why:**

- Queues audio chunks for gapless playback
- `onEnded` callback with `isLast: true` detects when all audio has played
- No need for setTimeout-based timing

## File Structure

```
services/
├── audio/
│   ├── audioManager.ts    # iOS audio session configuration
│   ├── streamer.ts        # Audio playback with buffer queue
│   └── recorder.ts        # Microphone recording (expo-stream-audio)
├── gemini/
│   ├── token.ts           # Gets short-lived Gemini Live tokens from Supabase
│   ├── websocketUrl.ts    # Builds direct-key or ephemeral-token WebSocket URLs
│   ├── websocket.ts       # WebSocket connection to Gemini
│   ├── phrasePlayback.ts  # Isolated Gemini playback for phrases
│   ├── translate.ts       # Translation wrapper via Supabase
│   └── types.ts           # TypeScript types for Gemini API
└── common/
    └── Logger.ts          # Logging utility
```

## Audio Flow

### Recording (User → Gemini)

1. `expo-stream-audio` captures microphone at 16kHz, mono, PCM
2. Every 20ms frame (~50 frames/second) sent to `onAudioData` callback
3. `geminiWebSocket.sendAudioChunk()` sends base64 PCM to Gemini
4. Audio is ALWAYS sent - no pausing during Sophie AI's speech

### Playback (Gemini → User)

1. Gemini sends audio chunks in `serverContent.modelTurn.parts[].inlineData`
2. Audio is 24kHz PCM (Gemini's output rate)
3. `audioStreamer.queueAudio()` converts and queues for playback
4. `onEnded` callback with `isLast: true` detects playback completion
5. `generationComplete` signal from Gemini marks end of response

## Message Flow

### Setup Message

```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-09-2025",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Aoede" }
        }
      }
    },
    "systemInstruction": { "parts": [{ "text": "..." }] },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {},
    "realtimeInputConfig": {
      "automaticActivityDetection": {
        "endOfSpeechSensitivity": "END_SENSITIVITY_LOW",
        "silenceDurationMs": 300
      }
    }
  }
}
```

### Audio Input Message

```json
{
  "realtimeInput": {
    "audio": {
      "mimeType": "audio/pcm;rate=16000",
      "data": "<base64 PCM data>"
    }
  }
}
```

### Server Response (Audio)

```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [
        {
          "inlineData": {
            "mimeType": "audio/pcm;rate=24000",
            "data": "<base64 PCM data>"
          }
        }
      ]
    }
  }
}
```

### Server Response (Transcription)

```json
{
  "serverContent": {
    "inputTranscription": { "text": "User said this" },
    "outputTranscription": { "text": "Sophie AI said this" }
  }
}
```

## Common Issues and Solutions

### Issue: User speech not detected after Sophie AI speaks

**Cause:** Audio was being paused during Sophie AI's speech, breaking VAD.

**Solution:** Keep audio streaming continuously. Hardware AEC handles echo.

### Issue: WebSocket closes with code 1007

**Cause:** Sending `activityStart`/`activityEnd` with automatic VAD enabled.

**Solution:** Remove all activity signals. Let automatic VAD handle everything.

### Issue: Echo/feedback during playback

**Cause:** Missing `iosMode: 'voiceChat'` configuration.

**Solution:** Call `configureAudioSession()` before creating AudioContext.

### Issue: Choppy or delayed audio playback

**Cause:** Using file-based playback or setTimeout timing.

**Solution:** Use `AudioBufferQueueSourceNode` with `onEnded` callback.

## Testing Checklist

- [ ] WebSocket stays connected (no 1007 errors)
- [ ] Sophie AI auto-greets when WebSocket setup completes (no button press needed)
- [ ] Quick tap on mic shows "Hold to Speak" tooltip
- [ ] Holding mic (200ms+) starts recording
- [ ] Sophie AI's voice is clear (no choppy audio)
- [ ] User can speak after Sophie AI finishes
- [ ] User's speech is transcribed (`input_transcription` in logs)
- [ ] Sophie AI responds to user's speech
- [ ] User can interrupt Sophie AI mid-speech
- [ ] No echo or feedback during playback

## Log Messages to Watch

### Healthy Flow

```
[GeminiWS] WebSocket Connected successfully
[GeminiWS] Setup complete - ready for conversation
[GeminiWS] Auto-sending greeting...
[GeminiWS] Sending greeting request
[AudioStreamer] Sophie AI started speaking
[AudioStreamer] Queued audio chunk #1 (23040 samples)
[AudioStreamer] onEnded: bufferId=X, isLast=true
[AudioStreamer] Sophie AI finished speaking
... user holds mic button ...
[ConversationStore] Starting PTT recording...
[GeminiWS] Sending audio chunk #1 (xxx chars)
... user releases mic button ...
[ConversationStore] Stopping PTT recording...
[GeminiWS] User transcribed: <user's speech>
[GeminiWS] Model transcribed: <Sophie's response>
```

### Problem Indicators

```
[GeminiWS] WebSocket Closed. Code: 1007  ← Activity signals with auto VAD
[GeminiWS] Audio sending paused          ← Audio pausing (bad)
[GeminiWS] Sending activityStart         ← Manual activity (bad with auto VAD)
```

## Dependencies

- `expo-stream-audio`: Microphone recording (16kHz, PCM)
- `react-native-audio-api`: Audio playback (AudioBufferQueueSourceNode, AudioManager)
- Native WebSocket: Connection to Gemini Live API

## Version History

- **v1.1** (2025-01-10): Push-to-Talk (PTT) Mode
  - Auto-greeting on WebSocket setup complete (no button press needed)
  - Timer-based hold detection (200ms threshold)
  - Quick tap shows "Hold to Speak" tooltip
  - Removed greeting from `startPTTRecording()` (now auto on setup)
  - Files changed: `websocket.ts`, `_layout.tsx`, `conversationStore.ts`

- **v1.0** (2025-01-07): Initial working implementation
  - Continuous audio streaming (no pausing)
  - Hardware AEC via AudioManager configuration
  - Automatic VAD with low end-of-speech sensitivity
  - AudioBufferQueueSourceNode for gapless playback
  - onEnded callback for accurate playback completion detection
