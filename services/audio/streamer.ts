import { decode } from "base64-arraybuffer";
import {
  AudioBufferQueueSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";
import { configureAudioSession } from "./audioManager";
import { Logger } from "../common/Logger";

const TAG = "AudioStreamer";
const SAMPLE_RATE = 24000; // Gemini output rate

// Accumulate chunks into 0.2s buffers before sending to native
const ACCUMULATION_TARGET = 4800; // 0.2s of audio at 24kHz (5 Gemini chunks)
const MIN_INITIAL_BUFFER = 7200; // 0.3s of audio before starting playback
const FADE_IN_DURATION = 0.01; // 10ms fade-in to prevent pops

// Reset AudioContext every response to prevent silence on reused contexts.
// Reusing an AudioContext across turns causes silent audio on iOS (the
// AVAudioEngine session gets disrupted by speech recognition ending between
// turns). A fresh context per response is fast and guarantees clean state.
const RESET_AFTER_RESPONSES = 1;

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
  private flushCount = 0;

  // Buffer accumulation (for native queue)
  private accumulatedSamples: Float32Array[] = [];
  private accumulatedLength = 0;
  private totalQueuedSamples = 0;

  private watchdogTimerId: ReturnType<typeof setTimeout> | null = null;
  private isPaused = false;
  private hasResponseCompleted = false; // True once finishSpeaking() has run
  private initPromise: Promise<void> | null = null;

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
      Logger.debug(TAG, 'initialize() skipped — already exists');
      return;
    }

    // Deduplicate concurrent calls — second caller awaits the same promise
    if (this.initPromise) {
      Logger.debug(TAG, 'initialize() — awaiting existing init');
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async doInitialize(): Promise<void> {
    await configureAudioSession();

    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    Logger.info(TAG, `Initialized AudioContext state=${this.audioContext.state}`);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);

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
      Logger.debug(TAG, "Audio engine primed");
    } catch (error) {
      Logger.error(TAG, "Failed to prime audio engine", error);
    }
  }

  prepareForNewResponse(): void {
    const entryState = this.audioContext?.state ?? 'null';
    const entryTime = this.audioContext?.currentTime ?? 0;
    Logger.debug(TAG, `[DIAG] prepareForNewResponse entry ctx.state=${entryState} ctx.time=${entryTime.toFixed(3)}`);

    this.clearWatchdog();

    // Cancel any pending gain automations from previous response
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(0);
      this.gainNode.gain.value = 1.0;
    }

    // If currently playing, stop and reset first
    if (this.isPlaying) {
      this.stopCurrentPlayback();
    }

    // Increment response ID to invalidate stale callbacks
    this.responseId++;

    // Periodic full reset to prevent memory buildup (every N responses)
    this.responsesSinceReset++;
    if (this.responsesSinceReset >= RESET_AFTER_RESPONSES) {
      Logger.info(TAG, `Periodic full reset after ${RESET_AFTER_RESPONSES} responses`);
      this.performFullReset();
      this.responsesSinceReset = 0;
    }

    // NOTE: suspend()→resume() was intentionally REMOVED here.
    // Those calls return Promises but were never awaited, causing a race
    // condition where createFreshQueueSource() would connect to a context
    // still in "suspended" state. This broke audio on the 2nd+ response.
    // The periodic full reset (every 2 responses) handles engine staleness.

    // Create a FRESH queueSource for each response
    this.createFreshQueueSource();

    this.isInterrupted = false;
    this.isGenerationComplete = false;
    this.hasStartedPlayback = false;
    this.chunkCount = 0;
    this.flushCount = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
    this.isPaused = false;
    this.hasResponseCompleted = false;

    const exitState = this.audioContext?.state ?? 'null';
    const exitTime = this.audioContext?.currentTime ?? 0;
    Logger.info(TAG, `[DIAG] Prepared response #${this.responseId} ctx.state=${exitState} ctx.time=${exitTime.toFixed(3)}`);
  }

  private performFullReset(): void {
    Logger.info(TAG, "Full reset — recreating AudioContext");

    // Close and recreate AudioContext to release all native resources.
    // NOTE: stop() is intentionally omitted — it writes directly to native
    // stopTime_ (audio thread sees immediately), while disconnect() goes
    // through the SPSC channel (processed next render quantum). This timing
    // mismatch can corrupt the GainNode's numberOfEnabledInputNodes_ counter.
    if (this.queueSource) {
      try {
        this.queueSource.clearBuffers();
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

    Logger.info(TAG, `Full reset done — ctx=${this.audioContext.state}`);
  }

  private stopCurrentPlayback(): void {
    this.clearWatchdog();

    // Cancel gain automations to prevent stale ramps affecting next response
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(0);
      this.gainNode.gain.value = 1.0;
    }

    // NOTE: stop() is intentionally omitted — see performFullReset() comment.
    if (this.queueSource) {
      try {
        this.queueSource.clearBuffers();
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
      Logger.info(TAG, "Stopped current playback");
      this.speakingStateCallback?.(false);
    }
  }

  private createFreshQueueSource(): void {
    if (!this.audioContext || !this.gainNode) {
      Logger.warn(TAG, `Cannot create queueSource — ctx=${!!this.audioContext} gain=${!!this.gainNode}`);
      return;
    }

    // CRITICAL: Fully cleanup old queue source to prevent degradation.
    // NOTE: stop() is intentionally omitted — see performFullReset() comment.
    if (this.queueSource) {
      try {
        this.queueSource.clearBuffers();
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
      // Only act on isLast from the current response while generation is complete
      if (!event.isLast || this.responseId !== currentResponseId) return;
      if (this.isGenerationComplete) {
        Logger.info(TAG, `onEnded — last buffer done, finishing`);
        this.finishSpeaking();
      }
    };
  }

  /**
   * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
   * (0.2s) before sending to native layer to reduce bridge traffic.
   */
  queueAudio(base64Pcm: string): void {
    if (this.isInterrupted || !this.audioContext || !this.queueSource) {
      if (!this.audioContext || !this.queueSource) {
        Logger.warn(TAG, `queueAudio dropped — ctx=${!!this.audioContext} src=${!!this.queueSource}`);
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

      if (this.chunkCount === 1) {
        Logger.debug(TAG, `[DIAG] First chunk arrived ctx.state=${this.audioContext?.state} ctx.time=${(this.audioContext?.currentTime ?? 0).toFixed(3)}`);
      }

      // Accumulate samples
      this.accumulatedSamples.push(float32Array);
      this.accumulatedLength += float32Array.length;

      // If we have enough accumulated, flush to native
      if (this.accumulatedLength >= ACCUMULATION_TARGET) {
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
        Logger.info(TAG, `Buffer ready — ${this.chunkCount} chunks, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s buffered, starting playback`);
        this.startSpeaking();
      }
    } catch (error) {
      Logger.error(TAG, "Error queueing audio", error);
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

    // Create AudioBuffer and queue
    const audioBuffer = this.audioContext.createBuffer(
      1,
      this.accumulatedLength,
      SAMPLE_RATE,
    );
    audioBuffer.getChannelData(0).set(merged);
    this.queueSource.enqueueBuffer(audioBuffer);

    // Track total queued
    this.totalQueuedSamples += this.accumulatedLength;
    this.flushCount++;

    // Explicit memory cleanup
    this.accumulatedSamples.length = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
  }

  private startSpeaking(): void {
    if (this.isPlaying || !this.queueSource || !this.gainNode) {
      Logger.warn(TAG, `startSpeaking skipped — playing=${this.isPlaying} src=${!!this.queueSource} gain=${!!this.gainNode}`);
      return;
    }

    // Cancel any leftover gain ramps from previous response, then apply fresh fade-in.
    // Per Web Audio spec, linearRampToValueAtTime ramps from the previous
    // automation event's value — NOT from gain.value. Without setValueAtTime
    // first, the ramp goes 1.0→1.0 (no-op), providing no fade-in protection.
    this.gainNode.gain.cancelScheduledValues(0);
    const currentTime = this.audioContext?.currentTime ?? 0;
    this.gainNode.gain.setValueAtTime(0, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      1.0,
      currentTime + FADE_IN_DURATION,
    );

    Logger.debug(TAG, `[DIAG] startSpeaking ctx.state=${this.audioContext?.state} ctx.time=${currentTime.toFixed(3)}`);

    // Start the queue source playback
    this.queueSource.start();

    this.isPlaying = true;
    this.hasStartedPlayback = true;
    this.bufferProgressCallback?.(100); // Clear progress
    Logger.info(TAG, `>>> SPEAKING started — resp=#${this.responseId} buffered=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s ctx.state=${this.audioContext?.state} ctx.time=${currentTime.toFixed(3)}`);
    this.speakingStateCallback?.(true);

    // Watchdog: verify AudioContext.currentTime is advancing (engine truly running)
    // Unified logic for all platforms — if stalled, go directly to full reset.
    // The previous iOS two-tier recovery (suspend→resume then escalate) had the
    // same unawaited-Promise race condition. Direct full reset is faster and safer.
    const watchdogResponseId = this.responseId;
    const startCurrentTime = this.audioContext?.currentTime ?? 0;

    this.clearWatchdog();
    this.watchdogTimerId = setTimeout(() => {
      if (this.responseId !== watchdogResponseId || !this.isPlaying) return;
      const nowCurrentTime = this.audioContext?.currentTime ?? 0;
      const delta = nowCurrentTime - startCurrentTime;
      Logger.debug(TAG, `[DIAG] WATCHDOG check start=${startCurrentTime.toFixed(3)} now=${nowCurrentTime.toFixed(3)} delta=${delta.toFixed(3)}`);
      if (delta < 0.1) {
        Logger.warn(TAG, `WATCHDOG: Stalled delta=${delta.toFixed(3)} — full reset`);
        this.performFullReset();
        this.createFreshQueueSource();
        this.isPlaying = false;
        this.hasStartedPlayback = false;
        this.speakingStateCallback?.(false);
      } else {
        Logger.debug(TAG, `WATCHDOG: OK delta=${delta.toFixed(3)}`);
      }
    }, 500);
  }

  onGenerationComplete(): void {
    if (this.isInterrupted) {
      Logger.debug(TAG, "onGenerationComplete — ignored (interrupted)");
      return;
    }

    this.isGenerationComplete = true;

    // Flush any remaining samples
    if (this.accumulatedLength > 0) {
      this.flushAccumulatedBuffer();
    }

    Logger.info(
      TAG,
      `Generation complete — ${this.chunkCount} chunks, ${this.flushCount} flushes, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s total, playing=${this.isPlaying}`,
    );

    // Start playback if we haven't yet (short responses)
    if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
      Logger.info(TAG, "Short response — starting late playback");
      this.startSpeaking();
    }

    // The onEnded callback (with isLast=true) will call finishSpeaking()
    // No setTimeout needed — native callback is more reliable
  }

  private finishSpeaking(): void {
    if (!this.isPlaying) return;
    this.clearWatchdog();

    Logger.info(TAG, `<<< SPEAKING finished — resp=#${this.responseId} ${this.chunkCount} chunks, ${this.flushCount} flushes, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s`);

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
    this.flushCount = 0;

    // Explicit memory cleanup
    if (this.accumulatedSamples.length > 0) {
      this.accumulatedSamples.length = 0;
    }
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
  }

  private clearWatchdog(): void {
    if (this.watchdogTimerId !== null) {
      clearTimeout(this.watchdogTimerId);
      this.watchdogTimerId = null;
    }
  }

  handleInterruption(): void {
    Logger.info(TAG, "Interrupted");
    this.clearWatchdog();
    this.isInterrupted = true;
    this.responseId++;

    this.stopCurrentPlayback();
    this.resetState();
  }

  clearQueue(): void {
    Logger.info(TAG, "Queue cleared");
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

    Logger.info(TAG, "Paused");
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

    Logger.info(TAG, "Resumed");

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    this.queueSource.start();
    this.isPlaying = true;
    this.isPaused = false;
    this.speakingStateCallback?.(true);
  }

  dispose(): void {
    Logger.info(TAG, "Disposed");
    this.clearWatchdog();
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
