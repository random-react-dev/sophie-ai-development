import { decode } from "base64-arraybuffer";
import {
  AudioBufferQueueSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";
import { Logger } from "../common/Logger";

const TAG = "AudioStreamer";
const SAMPLE_RATE = 24000; // Gemini output rate

// Accumulate chunks into 1s buffers before sending to native
const ACCUMULATION_TARGET = 24000; // 1.0s of audio at 24kHz
const MIN_INITIAL_BUFFER = 48000; // 2s of audio before starting playback
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
  private finishTimeout: ReturnType<typeof setTimeout> | null = null;
  private responseId = 0;
  private responsesSinceReset = 0;
  private isAudioPrimed = false;

  // Buffer accumulation
  private accumulatedSamples: Float32Array[] = [];
  private accumulatedLength = 0;
  private totalQueuedSamples = 0;

  // History for restart capability
  private fullResponseBuffer: Float32Array[] = [];

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
    configureAudioSession();

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

    // Cancel any pending finish timeout
    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
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
    this.chunkCount = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
    this.fullResponseBuffer = []; // Clear history for new response

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
    Logger.debug(TAG, "Created fresh AudioBufferQueueSourceNode");
  }

  /**
   * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
   * (2.0s) before sending to native layer to reduce bridge traffic.
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

      // Store in full history for restart capability
      this.fullResponseBuffer.push(float32Array);

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

      // Start playback once we have enough initial buffer (1.5s)
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
    // If we can't queue (paused/stopped), just clear the accumulator.
    // The data is already saved in this.fullResponseBuffer for restart/resume.
    if (!this.audioContext || !this.queueSource) {
      this.accumulatedSamples.length = 0;
      this.accumulatedSamples = [];
      this.accumulatedLength = 0;
      return;
    }

    if (this.accumulatedLength === 0) return;

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

    // Capture response ID for staleness check
    const currentResponseId = this.responseId;

    // Schedule finish based on audio duration
    const durationMs = (this.totalQueuedSamples / SAMPLE_RATE) * 1000;
    Logger.info(
      TAG,
      `Playback will finish in ~${(durationMs / 1000).toFixed(1)}s`,
    );

    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
    }

    this.finishTimeout = setTimeout(() => {
      if (
        this.responseId === currentResponseId &&
        this.isPlaying &&
        !this.isInterrupted
      ) {
        this.finishSpeaking();
      }
    }, durationMs + 1000);
  }

  private finishSpeaking(): void {
    if (!this.isPlaying) return;

    Logger.info(TAG, "Sophie finished speaking");

    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }

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
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
    this.fullResponseBuffer = [];
  }

  handleInterruption(): void {
    Logger.info(TAG, "Handling interruption");
    this.isInterrupted = true;
    this.responseId++;

    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }

    this.stopCurrentPlayback();
    this.resetState();
  }

  clearQueue(): void {
    Logger.info(TAG, "Clearing audio queue");
    this.handleInterruption();
    this.isInterrupted = false;
  }

  /**
   * Pause playback by ramping down volume and suspending the audio context.
   * Keeps the queue intact.
   */
  /**
   * Pause playback by ramping down volume and stopping the source.
   * This resets the playback position so it will restart on resume.
   */
  async pausePlayback(): Promise<void> {
    if (!this.audioContext || !this.gainNode || !this.isPlaying) return;

    Logger.info(TAG, "Pausing playback (fade out & reset)");

    // Ramp down volume
    const currentTime = this.audioContext.currentTime;
    this.gainNode.gain.cancelScheduledValues(currentTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.3); // 300ms fade out

    // Stop source after fade out (this resets position)
    setTimeout(async () => {
      if (this.queueSource) {
        try {
          this.queueSource.stop();
          this.queueSource.disconnect();
        } catch {
          /* ignore */
        }
        this.queueSource = null; // Force recreation on resume
      }
      this.isPlaying = false;

      // We don't necessarily need to suspend context if we destroyed the source,
      // but suspending saves battery if usage is prolonged.
      // For quick tab switches, keeping it running involves less latency.
      // Let's NOT suspend context here to make resume faster, since we stopped the source.
    }, 350);
  }

  /**
   * Resume playback by re-creating source and playing from START.
   */
  async resumePlayback(): Promise<void> {
    if (!this.audioContext || !this.gainNode) return;

    Logger.info(TAG, "Resuming playback (restart from beginning)");

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    // Capture current volume state for fade-in
    this.gainNode.gain.value = 0;

    // 1. Re-create the source (since we stopped/destroyed it on pause)
    this.createFreshQueueSource();

    // 2. Re-enqueue the ENTIRE history
    if (this.fullResponseBuffer.length > 0 && this.queueSource) {
      // We can optimize by merging into larger chunks if needed, but enqueueBuffer handles arrays fine.
      // Let's enable batch processing if the buffer is huge, but for now simple loop is fine.
      // Or better: merge into one big buffer if possible? No, streaming chunks is fine.

      // Strategy: We can re-use flushAccumulatedBuffer logic but we need to pass data.
      // Implementing simple merge for efficiency:

      const totalLen = this.fullResponseBuffer.reduce(
        (acc, c) => acc + c.length,
        0,
      );
      if (totalLen > 0) {
        const merged = new Float32Array(totalLen);
        let offset = 0;
        for (const chunk of this.fullResponseBuffer) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        const audioBuffer = this.audioContext.createBuffer(
          1,
          totalLen,
          SAMPLE_RATE,
        );
        audioBuffer.getChannelData(0).set(merged);
        this.queueSource.enqueueBuffer(audioBuffer);

        Logger.info(
          TAG,
          `Re-queued ${this.fullResponseBuffer.length} chunks (${(totalLen / SAMPLE_RATE).toFixed(1)}s) for restart`,
        );
      }
    }

    // 3. Start playback
    const currentTime = this.audioContext.currentTime;
    this.gainNode.gain.linearRampToValueAtTime(1.0, currentTime + 0.2); // 200ms fade in

    if (this.queueSource && this.fullResponseBuffer.length > 0) {
      this.queueSource.start();
      this.isPlaying = true;
      this.speakingStateCallback?.(true);
    }
  }

  dispose(): void {
    if (this.finishTimeout) {
      clearTimeout(this.finishTimeout);
      this.finishTimeout = null;
    }

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
