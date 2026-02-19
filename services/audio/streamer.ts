import { decode } from "base64-arraybuffer";
import {
  AudioBufferQueueSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";
import { Logger } from "../common/Logger";

const TAG = "AudioStreamer";
const SAMPLE_RATE = 24000; // Gemini output rate

// Accumulate chunks into 0.2s buffers before sending to native
const ACCUMULATION_TARGET = 4800; // 0.2s of audio at 24kHz (5 Gemini chunks)
const MIN_INITIAL_BUFFER = 7200; // 0.3s of audio before starting playback
const FADE_IN_DURATION = 0.2; // 200ms fade-in to prevent pops

// Periodic reset to prevent memory buildup
const RESET_AFTER_RESPONSES = 5;

type SpeakingStateCallback = (isSpeaking: boolean) => void;
type BufferProgressCallback = (progress: number) => void; // 0-100

class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private queueSource: AudioBufferQueueSourceNode | null = null;
  private isPlaying = false;
  private isInterrupted = false;
  private isGenerationComplete = false;
  private hasStartedPlayback = false;
  private chunkCount = 0;
  private speakingStateCallback: SpeakingStateCallback | null = null;
  private bufferProgressCallback: BufferProgressCallback | null = null;
  private responseId = 0;
  private responsesSinceReset = 0;
  private isAudioPrimed = false;

  // Buffer accumulation (for native queue)
  private accumulatedSamples: Float32Array[] = [];
  private accumulatedLength = 0;
  private totalQueuedSamples = 0;

  private isPaused = false;
  private hasResponseCompleted = false; // True once finishSpeaking() has run

  private static instance: AudioStreamer;
  private constructor() {}

  public static getInstance(): AudioStreamer {
    if (!AudioStreamer.instance) {
      AudioStreamer.instance = new AudioStreamer();
    }
    return AudioStreamer.instance;
  }

  setSpeakingStateCallback(callback: SpeakingStateCallback): void {
    this.speakingStateCallback = callback;
  }

  setBufferProgressCallback(callback: BufferProgressCallback): void {
    this.bufferProgressCallback = callback;
  }

  isReady(): boolean {
    return this.audioContext !== null;
  }

  async initialize(): Promise<void> {
    if (this.audioContext) {
      Logger.info(TAG, `[DIAG] initialize() skipped — AudioContext already exists (state=${this.audioContext.state})`);
      return;
    }

    const { configureAudioSession } = await import("./audioManager");
    Logger.info(TAG, "[DIAG] initialize() — calling configureAudioSession...");
    await configureAudioSession();
    Logger.info(TAG, "[DIAG] configureAudioSession completed");

    Logger.info(TAG, `[DIAG] Creating AudioContext with sampleRate=${SAMPLE_RATE}`);
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    Logger.info(TAG, `[DIAG] AudioContext created — state=${this.audioContext.state}, sampleRate=${this.audioContext.sampleRate}`);

    // Create GainNode at full volume to prevent iOS fade-in effects
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);
    Logger.info(TAG, "[DIAG] GainNode created and connected to destination");

    // Prime iOS audio engine with silent buffer
    this.primeAudioEngine();
  }

  /**
   * Play a tiny silent buffer to "wake up" iOS audio hardware.
   * Prevents fade-in effect on first real audio playback.
   */
  private primeAudioEngine(): void {
    if (!this.audioContext || this.isAudioPrimed) return;

    try {
      // Create a tiny silent buffer (1 sample)
      const silentBuffer = this.audioContext.createBuffer(1, 1, SAMPLE_RATE);
      const source = this.audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(this.audioContext.destination);
      source.start();

      this.isAudioPrimed = true;
      Logger.info(TAG, "iOS audio engine primed with silent buffer");
    } catch (error) {
      Logger.error(TAG, "Failed to prime audio engine", error);
    }
  }

  prepareForNewResponse(): void {
    Logger.info(TAG, `[DIAG] prepareForNewResponse() called — responseId=${this.responseId}, isPlaying=${this.isPlaying}, audioContext.state=${this.audioContext?.state ?? 'null'}`);

    // If currently playing, stop and reset first
    if (this.isPlaying) {
      Logger.info(TAG, "[DIAG] Stopping current playback for new response");
      this.stopCurrentPlayback();
    }

    // Increment response ID to invalidate stale callbacks
    this.responseId++;

    // Periodic full reset to prevent memory buildup (every N responses)
    this.responsesSinceReset++;
    if (this.responsesSinceReset >= RESET_AFTER_RESPONSES) {
      Logger.info(
        TAG,
        `[DIAG] Performing periodic full reset after ${RESET_AFTER_RESPONSES} responses`,
      );
      this.performFullReset();
      this.responsesSinceReset = 0;
    }

    // Force native engine restart to clear any stall.
    // The AVAudioEngine can silently stop processing while still reporting
    // "running". This suspend→resume cycle forces a clean engine restart.
    if (this.audioContext) {
      Logger.info(TAG, '[DIAG] Forcing engine restart via suspend→resume');
      this.audioContext.suspend();
      this.audioContext.resume();
    }

    // Create a FRESH queueSource for each response
    this.createFreshQueueSource();

    this.isInterrupted = false;
    this.isGenerationComplete = false;
    this.hasStartedPlayback = false;
    this.chunkCount = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
    this.isPaused = false;
    this.hasResponseCompleted = false;

    Logger.info(TAG, `[DIAG] Prepared for response #${this.responseId} — audioContext.state=${this.audioContext?.state ?? 'null'}`);
  }

  private performFullReset(): void {
    Logger.info(TAG, "[DIAG] performFullReset() — closing old AudioContext and creating fresh one");

    // Close and recreate AudioContext to release all native resources
    if (this.queueSource) {
      try {
        this.queueSource.clearBuffers();
        this.queueSource.stop();
        this.queueSource.disconnect();
      } catch {}
      this.queueSource = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    // Reinitialize
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);

    // Re-prime after full reset
    this.isAudioPrimed = false;
    this.primeAudioEngine();

    Logger.info(TAG, `[DIAG] Full reset complete — fresh AudioContext state=${this.audioContext.state}, sampleRate=${this.audioContext.sampleRate}`);
  }

  private stopCurrentPlayback(): void {
    if (this.queueSource) {
      try {
        this.queueSource.clearBuffers();
        this.queueSource.stop();
        this.queueSource.disconnect();
      } catch {
        /* ignore errors from already-stopped sources */
      }
      this.queueSource = null; // Explicit null to help GC
    }

    const wasPlaying = this.isPlaying;
    this.isPlaying = false;

    // Clear any accumulated samples immediately
    this.accumulatedSamples.length = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;

    if (wasPlaying) {
      this.speakingStateCallback?.(false);
    }
  }

  private createFreshQueueSource(): void {
    if (!this.audioContext || !this.gainNode) {
      Logger.warn(TAG, `[DIAG] createFreshQueueSource() — cannot create: audioContext=${!!this.audioContext}, gainNode=${!!this.gainNode}`);
      return;
    }

    // CRITICAL: Fully cleanup old queue source to prevent degradation
    // AudioBufferQueueSourceNode is single-use after stop()
    if (this.queueSource) {
      Logger.info(TAG, "[DIAG] createFreshQueueSource() — cleaning up old queueSource");
      try {
        this.queueSource.clearBuffers();
        this.queueSource.stop();
        this.queueSource.disconnect();
      } catch {
        /* ignore errors from already-stopped sources */
      }
      this.queueSource = null; // Explicit null to help GC
    }

    // Create fresh queue source and connect through GainNode
    this.queueSource = this.audioContext.createBufferQueueSource();
    this.queueSource.connect(this.gainNode);

    // Use native callback for reliable completion detection
    const currentResponseId = this.responseId;
    this.queueSource.onEnded = (event: { bufferId: string | undefined; isLast: boolean | undefined }) => {
      Logger.info(TAG, `[DIAG] onEnded callback — isLast=${event.isLast}, isGenerationComplete=${this.isGenerationComplete}, responseId match=${this.responseId === currentResponseId}`);
      if (event.isLast && this.isGenerationComplete && this.responseId === currentResponseId) {
        this.finishSpeaking();
      }
    };

    Logger.info(TAG, `[DIAG] Created fresh AudioBufferQueueSourceNode for response #${this.responseId}`);
  }

  /**
   * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
   * (0.2s) before sending to native layer to reduce bridge traffic.
   */
  queueAudio(base64Pcm: string): void {
    if (this.isInterrupted || !this.audioContext || !this.queueSource) {
      if (!this.audioContext || !this.queueSource) {
        Logger.warn(TAG, `[DIAG] queueAudio() dropped — audioContext=${!!this.audioContext}, queueSource=${!!this.queueSource}, isInterrupted=${this.isInterrupted}`);
      }
      return;
    }

    try {
      // Decode base64 to Float32
      const pcmArrayBuffer = decode(base64Pcm);
      const int16Array = new Int16Array(pcmArrayBuffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      this.chunkCount++;

      // Accumulate samples
      this.accumulatedSamples.push(float32Array);
      this.accumulatedLength += float32Array.length;

      Logger.info(TAG, `[DIAG] queueAudio chunk #${this.chunkCount} — decoded=${float32Array.length} samples, accumulated=${this.accumulatedLength}, totalQueued=${this.totalQueuedSamples}`);

      // If we have enough accumulated, flush to native
      if (this.accumulatedLength >= ACCUMULATION_TARGET) {
        Logger.info(TAG, `[DIAG] Accumulation threshold reached (${this.accumulatedLength} >= ${ACCUMULATION_TARGET}), flushing`);
        this.flushAccumulatedBuffer();
      }

      // Report buffer progress for UI feedback
      if (!this.hasStartedPlayback) {
        const progress = Math.min(
          100,
          Math.round((this.totalQueuedSamples / MIN_INITIAL_BUFFER) * 100),
        );
        this.bufferProgressCallback?.(progress);
      }

      // Start playback once we have enough initial buffer (0.3s)
      if (
        !this.hasStartedPlayback &&
        this.totalQueuedSamples >= MIN_INITIAL_BUFFER
      ) {
        Logger.info(TAG, `[DIAG] Initial buffer threshold reached (${this.totalQueuedSamples} >= ${MIN_INITIAL_BUFFER}), starting playback`);
        this.startSpeaking();
      }
    } catch (error) {
      Logger.error(TAG, "[DIAG] Error queueing audio", error);
    }
  }

  /**
   * Flush accumulated samples into a single AudioBuffer and queue it.
   */
  private flushAccumulatedBuffer(): void {
    if (!this.audioContext || !this.queueSource || this.accumulatedLength === 0)
      return;

    // Merge all accumulated samples
    const merged = new Float32Array(this.accumulatedLength);
    let offset = 0;
    for (const chunk of this.accumulatedSamples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const bufferSize = this.accumulatedLength;

    // Create AudioBuffer and queue
    const audioBuffer = this.audioContext.createBuffer(
      1,
      this.accumulatedLength,
      SAMPLE_RATE,
    );
    audioBuffer.getChannelData(0).set(merged);
    Logger.info(TAG, `[DIAG] flushAccumulatedBuffer() — enqueuing ${bufferSize} samples (${(bufferSize / SAMPLE_RATE * 1000).toFixed(0)}ms), audioContext.state=${this.audioContext.state}`);
    this.queueSource.enqueueBuffer(audioBuffer);

    // Track total queued
    this.totalQueuedSamples += this.accumulatedLength;
    Logger.info(TAG, `[DIAG] Total queued after flush: ${this.totalQueuedSamples} samples (${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s)`);

    // Explicit memory cleanup
    this.accumulatedSamples.length = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
  }

  private startSpeaking(): void {
    if (this.isPlaying || !this.queueSource || !this.gainNode) {
      Logger.warn(TAG, `[DIAG] startSpeaking() — skipped: isPlaying=${this.isPlaying}, queueSource=${!!this.queueSource}, gainNode=${!!this.gainNode}`);
      return;
    }

    // Apply fade-in to prevent audio pops
    this.gainNode.gain.value = 0;
    const currentTime = this.audioContext?.currentTime ?? 0;
    this.gainNode.gain.linearRampToValueAtTime(
      1.0,
      currentTime + FADE_IN_DURATION,
    );

    // Start the queue source playback
    Logger.info(
      TAG,
      `[DIAG] startSpeaking() — calling queueSource.start() with ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s buffered, fade-in=${FADE_IN_DURATION}s, audioContext.state=${this.audioContext?.state}, currentTime=${currentTime.toFixed(3)}`,
    );
    this.queueSource.start();
    Logger.info(TAG, "[DIAG] queueSource.start() returned");

    this.isPlaying = true;
    this.hasStartedPlayback = true;
    this.bufferProgressCallback?.(100); // Clear progress
    Logger.info(TAG, "[DIAG] Sophie started speaking — isPlaying=true, speakingStateCallback firing");
    this.speakingStateCallback?.(true);

    // Watchdog: verify AudioContext.currentTime is advancing (engine truly running)
    const watchdogResponseId = this.responseId;
    const startCurrentTime = this.audioContext?.currentTime ?? 0;

    // First check at 500ms — attempt suspend/resume recovery if stalled
    setTimeout(() => {
      if (this.responseId !== watchdogResponseId || !this.isPlaying) return;
      const nowCurrentTime = this.audioContext?.currentTime ?? 0;
      const delta = nowCurrentTime - startCurrentTime;
      if (delta < 0.1) {
        Logger.warn(TAG, `[DIAG] WATCHDOG: Engine stalled (delta=${delta.toFixed(3)}). Attempting suspend→resume recovery...`);
        if (this.audioContext) {
          this.audioContext.suspend();
          this.audioContext.resume();
        }

        // Second check at 1000ms — escalate to full reset if still stalled
        const postRecoveryTime = this.audioContext?.currentTime ?? 0;
        setTimeout(() => {
          if (this.responseId !== watchdogResponseId || !this.isPlaying) return;
          const finalTime = this.audioContext?.currentTime ?? 0;
          const recoveryDelta = finalTime - postRecoveryTime;
          if (recoveryDelta < 0.1) {
            Logger.warn(TAG, `[DIAG] WATCHDOG: Still stalled after suspend→resume (delta=${recoveryDelta.toFixed(3)}). Escalating to full reset...`);
            this.performFullReset();
            this.createFreshQueueSource();
            // Re-queue any pending audio — the current response's buffered audio
            // is lost, but isGenerationComplete flag and subsequent chunks will rebuild
            Logger.info(TAG, '[DIAG] WATCHDOG: Full reset complete. Playback will restart with next audio chunk.');
            this.isPlaying = false;
            this.hasStartedPlayback = false;
            this.speakingStateCallback?.(false);
          } else {
            Logger.info(TAG, `[DIAG] WATCHDOG: Engine recovered after suspend→resume (delta=${recoveryDelta.toFixed(3)})`);
          }
        }, 500);
      } else {
        Logger.info(TAG, `[DIAG] WATCHDOG: currentTime advancing normally (delta=${delta.toFixed(3)})`);
      }
    }, 500);
  }

  onGenerationComplete(): void {
    if (this.isInterrupted) {
      Logger.info(TAG, "[DIAG] onGenerationComplete() — ignored (interrupted)");
      return;
    }

    this.isGenerationComplete = true;

    // Flush any remaining samples
    if (this.accumulatedLength > 0) {
      Logger.info(TAG, `[DIAG] onGenerationComplete() — flushing remaining ${this.accumulatedLength} accumulated samples`);
      this.flushAccumulatedBuffer();
    }

    Logger.info(
      TAG,
      `[DIAG] onGenerationComplete() — ${this.chunkCount} chunks, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s total, hasStartedPlayback=${this.hasStartedPlayback}, isPlaying=${this.isPlaying}`,
    );

    // Start playback if we haven't yet (short responses)
    if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
      Logger.info(TAG, "[DIAG] onGenerationComplete() — short response, starting playback now");
      this.startSpeaking();
    }

    // The onEnded callback (with isLast=true) will call finishSpeaking()
    // No setTimeout needed — native callback is more reliable
  }

  private finishSpeaking(): void {
    if (!this.isPlaying) {
      Logger.info(TAG, "[DIAG] finishSpeaking() — skipped (not playing)");
      return;
    }

    Logger.info(TAG, "[DIAG] finishSpeaking() — Sophie finished speaking, resetting state");

    // Mark response as completed (so pausePlayback knows not to preserve buffer)
    this.hasResponseCompleted = true;

    this.resetState();
    this.speakingStateCallback?.(false);
  }

  private resetState(): void {
    this.isPlaying = false;
    this.isGenerationComplete = false;
    this.hasStartedPlayback = false;
    this.chunkCount = 0;

    // Explicit memory cleanup
    if (this.accumulatedSamples.length > 0) {
      this.accumulatedSamples.length = 0;
    }
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
  }

  handleInterruption(): void {
    Logger.info(TAG, "Handling interruption");
    this.isInterrupted = true;
    this.responseId++;

    this.stopCurrentPlayback();
    this.resetState();
  }

  clearQueue(): void {
    Logger.info(TAG, "Clearing audio queue");
    this.handleInterruption();
    this.isInterrupted = false;
  }

  /**
   * Pause playback using native pause() which preserves queue position.
   */
  pausePlayback(): void {
    if (this.hasResponseCompleted) {
      this.isPaused = false;
      return;
    }

    if (!this.audioContext || !this.queueSource || !this.isPlaying) return;

    Logger.info(TAG, "Pausing playback");
    this.queueSource.pause();
    this.isPlaying = false;
    this.isPaused = true;
    this.speakingStateCallback?.(false);
  }

  /**
   * Resume playback using native start() after a pause.
   */
  resumePlayback(): void {
    if (!this.audioContext || !this.queueSource) return;
    if (this.hasResponseCompleted) return;
    if (!this.isPaused) return;

    Logger.info(TAG, "Resuming playback");

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    this.queueSource.start();
    this.isPlaying = true;
    this.isPaused = false;
    this.speakingStateCallback?.(true);
  }

  dispose(): void {
    this.stopCurrentPlayback();

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.resetState();
    this.responsesSinceReset = 0;
    this.isAudioPrimed = false;
  }
}

export const audioStreamer = AudioStreamer.getInstance();
