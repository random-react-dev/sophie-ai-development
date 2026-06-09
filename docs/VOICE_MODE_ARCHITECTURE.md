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

## Talk Tab Conversation Modes

The Talk tab supports multiple conversation intents on top of the same Gemini Live audio path:

- **Tutor**: the default guided language tutor session.
- **Scenario**: immersive roleplay selected from the Scenarios tab.
- **Free Speaking**: casual open-ended conversation with Sophie as a friendly conversation partner.

Free Speaking Mode changes only the session prompt. It does not add a new backend, schema, token flow, quota path, audio recorder, or WebSocket implementation. It still uses:

1. AI consent gate.
2. `checkTalkQuota()` before token fetch.
3. `get-gemini-session` for a short-lived Gemini token.
4. `geminiWebSocket.connect(...)`.
5. The same push-to-talk mic button.

Free Speaking sends no initial prompt. Sophie waits for the user's first PTT turn, lets Gemini Live infer the spoken language from the user's audio, and mirrors that language in the reply. If the user switches languages on a later turn, Sophie switches with them.

Free Speaking must not show lesson report or vocabulary-save actions. The safety report action on Sophie messages remains available. It is for casual conversation only: no scores, corrections, tasks, vocabulary highlights, or lesson objectives.

## Push-to-Talk (PTT) Mode

### User Flow

1. **User visits Talk page** -> selects target and support languages from the active profile.
2. **User chooses mode** -> Tutor, Scenario, or Free Speaking.
3. **App requests token** -> `get-gemini-session` returns a short-lived Gemini Live token.
4. **WebSocket connects** -> Sophie can auto-greet when the mode provides an initial prompt.
5. **User holds mic** -> recording starts, audio streams to Gemini.
6. **User releases mic** -> app sends activity end, recording stops, Gemini processes and Sophie responds.
7. **Flow continues** -> user can hold again to speak.

### Key Implementation Details

**Auto-Greeting on Setup Complete** (`services/gemini/websocket.ts`)

```typescript
if (isSetupCompleteReceived) {
  this.isSetupComplete = true;
  this.setConnectionState("connected");

  if (!store.hasGreeted && this.lastInitialPrompt) {
    this.initializeAndGreet(store);
  }
}
```

**PTT Hold Handling** (`app/(tabs)/_layout.tsx`, `stores/conversationStore.ts`)

- The tab mic routes to the Talk tab first when tapped from another tab.
- When the Talk tab is active and connected, the long-press gesture starts PTT.
- `startPTTRecording()` sends `activityStart` and starts audio recording.
- `stopPTTRecording()` sends `activityEnd`, stops recording, and marks processing.
- Recordings shorter than `MIN_PTT_DURATION_MS` or with no captured frames are discarded.

```typescript
geminiWebSocket.sendActivityStart();
await audioRecorder.start({ onAudioData });

geminiWebSocket.sendActivityEnd();
await audioRecorder.stop();
```

**DO NOT:**

- Trigger greeting on button press (modes with an initial prompt greet on setup)
- Start recording when the WebSocket is not connected
- Remove the minimum recording validation

## Critical Design Decisions

### 1. Manual PTT Turn Boundaries

**PTT mode uses manual activity control.**

**Why:**

- The user explicitly controls when they are speaking by holding the mic.
- `activityStart` and `activityEnd` give Gemini clear turn boundaries.
- Short accidental presses can be discarded before they become model turns.

**Setup requirement:**

```typescript
realtimeInputConfig: {
  automaticActivityDetection: {
    disabled: true,
  },
  activityHandling: "NO_INTERRUPTION",
}
```

**DO NOT:**

- Enable automatic VAD while also sending `activityStart` or `activityEnd`.
- Send audio before setup is complete.
- Treat Free Speaking as a separate audio mode.

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

### 3. Manual Activity Configuration

The setup message disables automatic VAD because PTT sends explicit activity signals:

```typescript
realtimeInputConfig: {
  automaticActivityDetection: {
    disabled: true,
  },
  activityHandling: "NO_INTERRUPTION",
}
```

**Settings:**

- `disabled: true`: Gemini waits for manual activity boundaries.
- `NO_INTERRUPTION`: Current model output is protected while the user is not actively holding PTT.

**DO NOT:**

- Mix automatic VAD with manual activity signals.
- Remove `sendActivityStart()` / `sendActivityEnd()` from PTT.
- Add a second turn-taking system for Free Speaking.

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
- Active playback must not recreate `AudioContext` from a timer or `currentTime` watchdog; doing so can drop the already-queued start of Sophie's response.

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
4. Audio is sent only during the active PTT turn

### iOS Recorder Patch

The iOS recorder uses a patched `expo-stream-audio` native module. The patch keeps the same Talk/Gemini/WebSocket behavior and frame payloads, but defensively starts `AVAudioEngine` with the input node output format and validates the audio session before installing the mic tap. Because this is Swift code, changes require rebuilding the local Expo iOS app, not only reloading JavaScript.

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
        "disabled": true
      },
      "activityHandling": "NO_INTERRUPTION"
    }
  }
}
```

### Activity Messages

```json
{ "realtimeInput": { "activityStart": {} } }
{ "realtimeInput": { "activityEnd": {} } }
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

### Issue: PTT audio is ignored

**Cause:** WebSocket setup is not complete, the recording was too short, or no audio frames were captured.

**Solution:** Wait for `connectionState === "connected"`, hold long enough to capture frames, and keep `MIN_PTT_DURATION_MS` validation in place.

### Issue: WebSocket closes with code 1007

**Cause:** Mixing manual `activityStart`/`activityEnd` with automatic VAD.

**Solution:** Keep automatic activity detection disabled for PTT.

### Issue: Echo/feedback during playback

**Cause:** Missing `iosMode: 'voiceChat'` configuration.

**Solution:** Call `configureAudioSession()` before creating AudioContext.

### Issue: Choppy or delayed audio playback

**Cause:** Using file-based playback or setTimeout timing.

**Solution:** Use `AudioBufferQueueSourceNode` with `onEnded` callback.

### Issue: Sophie only speaks the last few words

**Cause:** Resetting `AudioContext` while a response is already playing can clear the beginning of the active queue.

**Solution:** Do not use timer/currentTime watchdog resets during active response playback. Let the queue play and finish through `onEnded`.

## Testing Checklist

- [ ] WebSocket stays connected (no 1007 errors)
- [ ] Sophie AI auto-greets on setup only when the mode provides an initial prompt
- [ ] Holding mic starts PTT recording
- [ ] Very short or empty recordings are discarded
- [ ] Sophie AI's voice is clear (no choppy audio)
- [ ] User's speech is transcribed (`input_transcription` in logs)
- [ ] Sophie AI responds to user's speech
- [ ] User can interrupt Sophie AI mid-speech
- [ ] No echo or feedback during playback
- [ ] Free Speaking waits for the user's first PTT turn to mirror their language
- [ ] Free Speaking does not show report generation, corrections, scores, or vocabulary-save actions

## Log Messages to Watch

### Healthy Flow (Mode With Initial Prompt)

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
[GeminiWS] WebSocket Closed. Code: 1007  <- Activity signals mixed with auto VAD
[ConversationStore] Cannot start PTT: WebSocket not ready
[ConversationStore] Recording too short
```

## Dependencies

- `expo-stream-audio`: Microphone recording (16kHz, PCM)
- `react-native-audio-api`: Audio playback (AudioBufferQueueSourceNode, AudioManager)
- Native WebSocket: Connection to Gemini Live API

## Version History

- **v1.3** (2026-05-09): Active playback watchdog removal
  - Removed timer/currentTime-based AudioContext reset during active Sophie playback.
  - Keeps queue playback completion driven by `AudioBufferQueueSourceNode.onEnded`.
  - Prevents first words from being dropped while Gemini audio chunks are otherwise healthy.
  - Files changed: `streamer.ts`, `streamer.test.ts`, `VOICE_MODE_ARCHITECTURE.md`

- **v1.2** (2026-05-08): Free Speaking Mode
  - Added casual conversation mode inside the Talk tab.
  - Reuses the same Gemini Live token, WebSocket, quota, transcript, and PTT flow.
  - Free Speaking waits for the user's first PTT turn to mirror their language.
  - Hides lesson report and vocabulary actions for Free Speaking sessions.
  - Files changed: `talk.tsx`, `talkSessionConfig.ts`, `scenarioStore.ts`, `MessageBubble.tsx`

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
