import { decode } from "base64-arraybuffer";
import {
  AudioBuffer as RNAudioBuffer,
  AudioBufferSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";
import { Platform } from "react-native";
import { configureAudioSession } from "./audioManager";
import { Logger } from "../common/Logger";

const TAG = "AudioStreamer";
const SAMPLE_RATE = 24000; // Gemini output rate

// Accumulate chunks into 0.2s buffers before sending to native
const ACCUMULATION_TARGET = 4800; // 0.2s of audio at 24kHz (5 Gemini chunks)
const MIN_INITIAL_BUFFER = 24000; // 1.0s of audio before streaming start
const FADE_IN_DURATION = 0.01; // 10ms fade-in to prevent pops

// Adaptive Talk-start tuning for low latency + smoothness.
const START_BUFFER_SECONDS = 1.2;
const MAX_START_WAIT_MS = 1800;
const MIN_FALLBACK_BUFFER_SECONDS = 0.8;
const LOW_WATERMARK_SECONDS = 0.35;
const HIGH_WATERMARK_SECONDS = 1.0;

const START_BUFFER_SAMPLES = Math.round(START_BUFFER_SECONDS * SAMPLE_RATE);
const MIN_FALLBACK_BUFFER_SAMPLES = Math.round(
  MIN_FALLBACK_BUFFER_SECONDS * SAMPLE_RATE,
);

// Platform-specific reset cadence.
const RESET_AFTER_RESPONSES_IOS = 1;
const RESET_AFTER_RESPONSES_ANDROID = 3;

type SpeakingStateCallback = (isSpeaking: boolean) => void;
type BufferProgressCallback = (progress: number) => void; // 0-100
type PlaybackStartPolicy = "streaming" | "adaptive" | "onGenerationComplete";

interface PrepareOptions {
  startPolicy?: PlaybackStartPolicy;
}

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
  private pendingBuffers: RNAudioBuffer[] = []; // buffers waiting for startSpeaking()
  private lastScheduledSource: AudioBufferSourceNode | null = null; // for onEnded
  private startPolicy: PlaybackStartPolicy = this.getDefaultStartPolicy();

  // Diagnostics and adaptive control
  private firstAudioChunkAtMs: number | null = null;
  private generationCompleteAtMs: number | null = null;
  private playbackStartedAtMs: number | null = null;
  private hasLoggedBufferReady = false;
  private isRebuffering = false;
  private rebufferCount = 0;

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

  private getDefaultStartPolicy(): PlaybackStartPolicy {
    return Platform.OS === "android" ? "adaptive" : "streaming";
  }

  private getResetAfterResponses(): number {
    return Platform.OS === "android"
      ? RESET_AFTER_RESPONSES_ANDROID
      : RESET_AFTER_RESPONSES_IOS;
  }

  private getBufferedAheadSeconds(): number {
    if (!this.audioContext) return 0;
    return Math.max(0, this.nextPlaybackTime - this.audioContext.currentTime);
  }

  private shouldStartPlayback(): string | null {
    if (this.hasStartedPlayback || this.totalQueuedSamples === 0) return null;

    const bufferedSeconds = this.totalQueuedSamples / SAMPLE_RATE;

    if (this.startPolicy === "onGenerationComplete") {
      return null;
    }

    if (this.startPolicy === "streaming") {
      if (this.totalQueuedSamples >= MIN_INITIAL_BUFFER) {
        return `streaming-${bufferedSeconds.toFixed(2)}s`;
      }
      return null;
    }

    if (this.totalQueuedSamples >= START_BUFFER_SAMPLES) {
      return `adaptive-buffer-${bufferedSeconds.toFixed(2)}s`;
    }

    if (this.firstAudioChunkAtMs !== null) {
      const elapsedMs = Date.now() - this.firstAudioChunkAtMs;
      if (
        elapsedMs >= MAX_START_WAIT_MS &&
        this.totalQueuedSamples >= MIN_FALLBACK_BUFFER_SAMPLES
      ) {
        return `adaptive-timeout-${elapsedMs}ms-${bufferedSeconds.toFixed(2)}s`;
      }
    }

    return null;
  }

  private updateRebufferingState(): void {
    if (!this.audioContext || !this.gainNode || !this.isPlaying || this.isPaused) {
      return;
    }

    const bufferedAhead = this.getBufferedAheadSeconds();

    if (
      !this.isRebuffering &&
      !this.isGenerationComplete &&
      bufferedAhead < LOW_WATERMARK_SECONDS
    ) {
      this.isRebuffering = true;
      this.rebufferCount++;
      this.gainNode.gain.cancelScheduledValues(0);
      this.gainNode.gain.value = 0;
      Logger.info(
        TAG,
        `[DIAG] Rebuffer enter — ahead=${bufferedAhead.toFixed(2)}s count=${this.rebufferCount}`,
      );
      return;
    }

    if (
      this.isRebuffering &&
      (bufferedAhead >= HIGH_WATERMARK_SECONDS || this.isGenerationComplete)
    ) {
      this.isRebuffering = false;
      const now = this.audioContext.currentTime;
      this.gainNode.gain.cancelScheduledValues(0);
      this.gainNode.gain.setValueAtTime(0, now);
      this.gainNode.gain.linearRampToValueAtTime(1.0, now + FADE_IN_DURATION);
      this.gainNode.gain.value = 1.0;
      Logger.info(
        TAG,
        `[DIAG] Rebuffer exit — ahead=${bufferedAhead.toFixed(2)}s`,
      );
    }
  }

  prepareForNewResponse(options?: PrepareOptions): void {
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

    this.startPolicy = options?.startPolicy ?? this.getDefaultStartPolicy();

    // Periodic full reset to prevent memory buildup (every N responses)
    const resetAfterResponses = this.getResetAfterResponses();
    this.responsesSinceReset++;
    if (this.responsesSinceReset >= resetAfterResponses) {
      Logger.info(
        TAG,
        `Periodic full reset after ${resetAfterResponses} responses (platform=${Platform.OS})`,
      );
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
    this.firstAudioChunkAtMs = null;
    this.generationCompleteAtMs = null;
    this.playbackStartedAtMs = null;
    this.hasLoggedBufferReady = false;
    this.isRebuffering = false;
    this.rebufferCount = 0;

    const exitState = this.audioContext?.state ?? 'null';
    const exitTime = this.audioContext?.currentTime ?? 0;
    Logger.info(
      TAG,
      `[DIAG] Prepared response #${this.responseId} ctx.state=${exitState} ctx.time=${exitTime.toFixed(3)} startPolicy=${this.startPolicy}`,
    );
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
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
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
    this.isRebuffering = false;

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
  private scheduleBuffer(audioBuffer: RNAudioBuffer): void {
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
    this.updateRebufferingState();
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
        this.firstAudioChunkAtMs = Date.now();
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
        const progressTarget =
          this.startPolicy === "adaptive"
            ? START_BUFFER_SAMPLES
            : MIN_INITIAL_BUFFER;
        const progress = Math.min(
          100,
          Math.round((this.totalQueuedSamples / progressTarget) * 100),
        );
        this.bufferProgressCallback?.(progress);
      }

      if (
        !this.hasStartedPlayback &&
        !this.hasLoggedBufferReady &&
        this.totalQueuedSamples >= MIN_INITIAL_BUFFER
      ) {
        const bufferedSeconds = (this.totalQueuedSamples / SAMPLE_RATE).toFixed(2);
        if (this.startPolicy === "onGenerationComplete") {
          Logger.info(
            TAG,
            `Buffer ready — ${this.chunkCount} chunks, ${bufferedSeconds}s buffered, deferring playback until generation complete`,
          );
        } else {
          Logger.info(
            TAG,
            `Buffer ready — ${this.chunkCount} chunks, ${bufferedSeconds}s buffered`,
          );
        }
        this.hasLoggedBufferReady = true;
      }

      const startReason = this.shouldStartPlayback();
      if (startReason) {
        this.startSpeaking(startReason);
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

  private startSpeaking(reason: string): void {
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
    this.playbackStartedAtMs = Date.now();
    this.hasLoggedBufferReady = true;
    this.bufferProgressCallback?.(100); // Clear progress
    const firstChunkToStartMs =
      this.firstAudioChunkAtMs === null || this.playbackStartedAtMs === null
        ? "na"
        : `${this.playbackStartedAtMs - this.firstAudioChunkAtMs}`;
    const generationToStartMs =
      this.generationCompleteAtMs === null || this.playbackStartedAtMs === null
        ? "na"
        : `${this.playbackStartedAtMs - this.generationCompleteAtMs}`;
    Logger.info(
      TAG,
      `>>> SPEAKING started — resp=#${this.responseId} buffered=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s ctx.state=${this.audioContext?.state} ctx.time=${currentTime.toFixed(3)} policy=${this.startPolicy} reason=${reason} firstChunkToStartMs=${firstChunkToStartMs} generationToStartMs=${generationToStartMs}`,
    );
    this.speakingStateCallback?.(true);
    this.updateRebufferingState();
  }

  onGenerationComplete(): void {
    if (this.isInterrupted) {
      Logger.debug(TAG, "onGenerationComplete — ignored (interrupted)");
      return;
    }

    this.isGenerationComplete = true;
    this.generationCompleteAtMs = Date.now();

    // Flush any remaining samples
    if (this.accumulatedLength > 0) {
      this.flushAccumulatedBuffer();
    }

    const firstChunkToGenerationMs =
      this.firstAudioChunkAtMs === null || this.generationCompleteAtMs === null
        ? "na"
        : `${this.generationCompleteAtMs - this.firstAudioChunkAtMs}`;
    Logger.info(
      TAG,
      `Generation complete — ${this.chunkCount} chunks, ${this.flushCount} flushes, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s total, playing=${this.isPlaying}, firstChunkToGenerationMs=${firstChunkToGenerationMs}`,
    );

    // Start playback if we haven't yet (short responses)
    if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
      this.startSpeaking("generation-complete");
    }

    this.updateRebufferingState();

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

    Logger.info(
      TAG,
      `<<< SPEAKING finished — resp=#${this.responseId} ${this.chunkCount} chunks, ${this.flushCount} flushes, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s rebufferCount=${this.rebufferCount}`,
    );

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
    this.firstAudioChunkAtMs = null;
    this.generationCompleteAtMs = null;
    this.playbackStartedAtMs = null;
    this.hasLoggedBufferReady = false;
    this.isRebuffering = false;
    this.rebufferCount = 0;

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
