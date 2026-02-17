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
    if (this.audioContext) return;

    const { configureAudioSession } = await import("./audioManager");
    await configureAudioSession();

    Logger.info(TAG, "Initializing audio context");
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });

    // Create GainNode at full volume to prevent iOS fade-in effects
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);

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
    // If currently playing, stop and reset first
    if (this.isPlaying) {
      Logger.info(TAG, "Stopping current playback for new response");
      this.stopCurrentPlayback();
    }

    // Increment response ID to invalidate stale callbacks
    this.responseId++;

    // Periodic full reset to prevent memory buildup (every N responses)
    this.responsesSinceReset++;
    if (this.responsesSinceReset >= RESET_AFTER_RESPONSES) {
      Logger.info(
        TAG,
        `Performing periodic full reset after ${RESET_AFTER_RESPONSES} responses`,
      );
      this.performFullReset();
      this.responsesSinceReset = 0;
    }

    // Resume AudioContext if suspended
    if (this.audioContext?.state === "suspended") {
      Logger.info(TAG, "Resuming AudioContext for new response");
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

    Logger.info(TAG, `Prepared for response #${this.responseId}`);
  }

  private performFullReset(): void {
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

    Logger.info(TAG, "Full reset complete - fresh AudioContext created");
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
    if (!this.audioContext || !this.gainNode) return;

    // CRITICAL: Fully cleanup old queue source to prevent degradation
    // AudioBufferQueueSourceNode is single-use after stop()
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

    // Create fresh queue source and connect through GainNode
    this.queueSource = this.audioContext.createBufferQueueSource();
    this.queueSource.connect(this.gainNode);

    // Use native callback for reliable completion detection
    const currentResponseId = this.responseId;
    this.queueSource.onEnded = (event: { bufferId: string | undefined; isLast: boolean | undefined }) => {
      if (event.isLast && this.isGenerationComplete && this.responseId === currentResponseId) {
        this.finishSpeaking();
      }
    };

    Logger.debug(TAG, "Created fresh AudioBufferQueueSourceNode");
  }

  /**
   * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
   * (0.2s) before sending to native layer to reduce bridge traffic.
   */
  queueAudio(base64Pcm: string): void {
    if (this.isInterrupted || !this.audioContext || !this.queueSource) return;

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

    // Explicit memory cleanup
    this.accumulatedSamples.length = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
  }

  private startSpeaking(): void {
    if (this.isPlaying || !this.queueSource || !this.gainNode) return;

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
      `Starting playback (${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(1)}s buffered, ${FADE_IN_DURATION * 1000}ms fade-in)`,
    );
    this.queueSource.start();

    this.isPlaying = true;
    this.hasStartedPlayback = true;
    this.bufferProgressCallback?.(100); // Clear progress
    Logger.info(TAG, "Sophie started speaking");
    this.speakingStateCallback?.(true);
  }

  onGenerationComplete(): void {
    if (this.isInterrupted) return;

    this.isGenerationComplete = true;

    // Flush any remaining samples
    if (this.accumulatedLength > 0) {
      this.flushAccumulatedBuffer();
    }

    Logger.info(
      TAG,
      `Generation complete (${this.chunkCount} chunks, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(1)}s total)`,
    );

    // Start playback if we haven't yet (short responses)
    if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
      this.startSpeaking();
    }

    // The onEnded callback (with isLast=true) will call finishSpeaking()
    // No setTimeout needed — native callback is more reliable
  }

  private finishSpeaking(): void {
    if (!this.isPlaying) return;

    Logger.info(TAG, "Sophie finished speaking");

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
