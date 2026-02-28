import { decode } from "base64-arraybuffer";
import {
  AudioBufferSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";
import { configureAudioSession } from "./audioManager";
import { Logger } from "../common/Logger";

const TAG = "AudioStreamer";
const SAMPLE_RATE = 24000; // Gemini output rate

// Accumulate chunks into 0.2s buffers before sending to native
const ACCUMULATION_TARGET = 4800; // 0.2s of audio at 24kHz (5 Gemini chunks)
const MIN_INITIAL_BUFFER = 24000; // 1.0s of audio before starting playback
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

  private isPaused = false;
  private hasResponseCompleted = false; // True once finishSpeaking() has run
  private initPromise: Promise<void> | null = null;

  // Scheduled playback state
  private nextPlaybackTime = 0; // ctx.currentTime when next buffer should start
  private pendingBuffers: AudioBuffer[] = []; // buffers waiting for startSpeaking()
  private lastScheduledSource: AudioBufferSourceNode | null = null; // for onEnded

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
    this.pendingBuffers = [];
    this.nextPlaybackTime = 0;
    this.lastScheduledSource = null;

    const exitState = this.audioContext?.state ?? 'null';
    const exitTime = this.audioContext?.currentTime ?? 0;
    Logger.info(TAG, `[DIAG] Prepared response #${this.responseId} ctx.state=${exitState} ctx.time=${exitTime.toFixed(3)}`);
  }

  private performFullReset(): void {
    Logger.info(TAG, "Full reset — recreating AudioContext");

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
    // Cancel gain automations to prevent stale ramps affecting next response
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(0);
      this.gainNode.gain.value = 1.0;
    }

    // Disconnect and recreate gain node to instantly silence all scheduled sources
    if (this.gainNode && this.audioContext) {
      this.gainNode.disconnect();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      this.gainNode.connect(this.audioContext.destination);
    }

    this.pendingBuffers = [];
    this.lastScheduledSource = null;

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

  /**
   * Schedule an AudioBuffer for playback at the next available time.
   * Uses the native audio engine's timeline for sample-accurate scheduling.
   */
  private scheduleBuffer(audioBuffer: AudioBuffer): void {
    if (!this.audioContext || !this.gainNode) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const now = this.audioContext.currentTime;
    if (this.nextPlaybackTime < now) {
      // Delivery fell behind — skip to now with small offset
      this.nextPlaybackTime = now + 0.02;
    }

    source.start(this.nextPlaybackTime);
    this.nextPlaybackTime += audioBuffer.duration;
    this.lastScheduledSource = source;
  }

  /**
   * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
   * (0.2s) before sending to native layer to reduce bridge traffic.
   */
  queueAudio(base64Pcm: string): void {
    if (this.isInterrupted || !this.audioContext) {
      if (!this.audioContext) {
        Logger.warn(TAG, `queueAudio dropped — ctx=${!!this.audioContext}`);
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

      // Start playback once we have enough initial buffer (1.0s)
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
   * Flush accumulated samples into a single AudioBuffer and either
   * schedule it immediately (if playback started) or queue for later.
   */
  private flushAccumulatedBuffer(): void {
    if (!this.audioContext || this.accumulatedLength === 0)
      return;

    // Merge all accumulated samples
    const merged = new Float32Array(this.accumulatedLength);
    let offset = 0;
    for (const chunk of this.accumulatedSamples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1,
      this.accumulatedLength,
      SAMPLE_RATE,
    );
    audioBuffer.getChannelData(0).set(merged);

    // Track total queued
    this.totalQueuedSamples += this.accumulatedLength;
    this.flushCount++;

    // Either schedule immediately or queue for startSpeaking()
    if (this.hasStartedPlayback) {
      this.scheduleBuffer(audioBuffer);
    } else {
      this.pendingBuffers.push(audioBuffer);
    }

    // Explicit memory cleanup
    this.accumulatedSamples.length = 0;
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
  }

  private startSpeaking(): void {
    if (this.isPlaying || !this.gainNode) {
      Logger.warn(TAG, `startSpeaking skipped — playing=${this.isPlaying} gain=${!!this.gainNode}`);
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

    // Schedule all pending buffers starting now
    this.nextPlaybackTime = currentTime;
    for (const buffer of this.pendingBuffers) {
      this.scheduleBuffer(buffer);
    }
    this.pendingBuffers = [];

    this.isPlaying = true;
    this.hasStartedPlayback = true;
    this.bufferProgressCallback?.(100); // Clear progress
    Logger.info(TAG, `>>> SPEAKING started — resp=#${this.responseId} buffered=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s ctx.state=${this.audioContext?.state} ctx.time=${currentTime.toFixed(3)}`);
    this.speakingStateCallback?.(true);
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

    // Set onEnded on last scheduled source for native completion detection
    if (this.lastScheduledSource && this.isPlaying) {
      const currentResponseId = this.responseId;
      this.lastScheduledSource.onEnded = () => {
        if (this.responseId !== currentResponseId) return;
        this.finishSpeaking();
      };
    }
  }

  private finishSpeaking(): void {
    if (!this.isPlaying) return;

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
    this.pendingBuffers = [];
    this.nextPlaybackTime = 0;
    this.lastScheduledSource = null;

    // Explicit memory cleanup
    if (this.accumulatedSamples.length > 0) {
      this.accumulatedSamples.length = 0;
    }
    this.accumulatedSamples = [];
    this.accumulatedLength = 0;
    this.totalQueuedSamples = 0;
  }

  handleInterruption(): void {
    Logger.info(TAG, "Interrupted");
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
   * Pause playback by muting gain. Scheduled audio continues silently.
   */
  pausePlayback(): void {
    if (this.hasResponseCompleted || !this.isPlaying) return;

    this.gainNode?.gain.cancelScheduledValues(0);
    if (this.gainNode) this.gainNode.gain.value = 0;
    this.isPaused = true;
    this.speakingStateCallback?.(false);
  }

  /**
   * Resume playback by restoring gain.
   */
  resumePlayback(): void {
    if (!this.isPaused || this.hasResponseCompleted) return;

    if (this.gainNode) this.gainNode.gain.value = 1.0;
    this.isPaused = false;
    this.speakingStateCallback?.(true);
  }

  dispose(): void {
    Logger.info(TAG, "Disposed");
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
