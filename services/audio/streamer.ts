import { decode } from "base64-arraybuffer";
import { Platform } from "react-native";
import {
  AudioBufferQueueSourceNode,
  AudioContext,
  GainNode,
} from "react-native-audio-api";
import { Logger } from "../common/Logger";
import { configureAudioSession } from "./audioManager";

const TAG = "AudioStreamer";
const SAMPLE_RATE = 24000; // Gemini output rate
const IS_ANDROID = Platform.OS === "android";
const AUDIO_DIAG_VERBOSE = process.env.EXPO_PUBLIC_AUDIO_DIAG === "1";
const STARTUP_SLA_MS = Number(
  process.env.EXPO_PUBLIC_STARTUP_SLA_MS ?? "10000",
);

// Use larger prebuffer on Android for smoother continuous playback under JS load.
const ACCUMULATION_TARGET = IS_ANDROID ? 19200 : 4800; // Android: 0.8s, iOS: 0.2s
const MIN_INITIAL_BUFFER = IS_ANDROID ? 52800 : 7200; // Android: 2.2s, iOS: 0.3s
const MIN_START_DELAY_MS = IS_ANDROID ? 2200 : 0;
const EARLY_START_BUFFER_SECONDS_ANDROID = 3.0;
const SAFE_START_BUFFER_SECONDS_ANDROID = 4.5;
const MAX_DEFER_MS_ANDROID = Math.min(9000, STARTUP_SLA_MS);
const RATE_WINDOW_MS = 1000;
const RATE_WINDOW_MIN_FOR_NORMAL_START = 0.95;
const RATE_WINDOW_MIN_FOR_SAFE_START = 0.55;
const MIN_RATE_FOR_EARLY_START_AT_1X = 0.92;
const MIN_BUFFER_FOR_EARLY_START_AT_1X = 6.5;
const RATE_WINDOW_SLOW_THRESHOLD = 0.9;
const RATE_WINDOW_SEVERE_SLOW = 0.45;
const RATE_WINDOWS_REQUIRED = 2;
const QUEUE_HEARTBEAT_MS = 500;
const FADE_IN_DURATION = 0.01; // 10ms fade-in to prevent pops
const NORMAL_PLAYBACK_RATE = 1.0;
const SAFE_PLAYBACK_RATE = 0.8;
const ALLOW_ANDROID_QUEUE_RATE_EXPERIMENT =
  process.env.EXPO_PUBLIC_ANDROID_QUEUE_RATE_EXPERIMENT === "1";

// Reset AudioContext every response to prevent silence on reused contexts.
// Reusing an AudioContext across turns causes silent audio on iOS (the
// AVAudioEngine session gets disrupted by speech recognition ending between
// turns). A fresh context per response is fast and guarantees clean state.
const RESET_AFTER_RESPONSES = IS_ANDROID ? 4 : 1;

type SpeakingStateCallback = (isSpeaking: boolean) => void;
type BufferProgressCallback = (progress: number) => void; // 0-100
type StreamIssueClassification =
  | "healthy_stream"
  | "api_or_network_slow_stream"
  | "client_processing_backpressure";
type StartupProfile = "normal_1x" | "safe_0_8x" | "deferred_until_complete";
type StartupReason =
  | "normal_buffer_ready"
  | "sustained_healthy_early_start"
  | "safe_buffer_early_start"
  | "max_defer_timeout_start"
  | "sla_force_start"
  | "generation_complete_late_start";
type PlaybackRateGuardReason = "android_queue_rate_guard" | "none";

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
  private totalReceivedSamples = 0;

  private watchdogTimerId: ReturnType<typeof setTimeout> | null = null;
  private delayedStartTimerId: ReturnType<typeof setTimeout> | null = null;
  private queueHeartbeatTimerId: ReturnType<typeof setInterval> | null = null;
  private isPaused = false;
  private hasResponseCompleted = false; // True once finishSpeaking() has run
  private initPromise: Promise<void> | null = null;
  private firstChunkWallTimeMs: number | null = null;
  private speakingStartWallTimeMs: number | null = null;
  private speakingStartContextTime: number | null = null;
  private startupReason: StartupReason | null = null;
  private startupProfile: StartupProfile = "deferred_until_complete";
  private targetPlaybackRate = NORMAL_PLAYBACK_RATE;
  private activePlaybackRate = NORMAL_PLAYBACK_RATE;
  private turnTraceId = "turn-unknown";
  private deferStartUntilGenerationComplete = false;
  private underrunRiskCount = 0;
  private starvationEventCount = 0;
  private queueLowWatermarkSeconds = Number.POSITIVE_INFINITY;
  private lastRateEvalAtMs: number | null = null;
  private lastRateEvalReceivedSeconds = 0;
  private sustainedHealthyWindows = 0;
  private sawSlowRateWindow = false;
  private rateWindowMin = Number.POSITIVE_INFINITY;
  private rateWindowMax = 0;
  private rateWindowSum = 0;
  private rateWindowCount = 0;
  private maxDeferTimeoutLogged = false;
  private turnActivityEndAtMs: number | null = null;
  private startupSlaLogged = false;

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
      Logger.debug(TAG, "initialize() skipped - already exists");
      return;
    }

    // Deduplicate concurrent calls - second caller awaits the same promise
    if (this.initPromise) {
      Logger.debug(TAG, "initialize() - awaiting existing init");
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
    Logger.info(
      TAG,
      `Initialized AudioContext state=${this.audioContext.state}`,
    );

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

  prepareForNewResponse(traceId?: string, activityEndAtMs?: number): void {
    const entryState = this.audioContext?.state ?? "null";
    const entryTime = this.audioContext?.currentTime ?? 0;
    Logger.debug(
      TAG,
      `[DIAG] prepareForNewResponse entry ctx.state=${entryState} ctx.time=${entryTime.toFixed(3)}`,
    );

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
      Logger.info(
        TAG,
        `Periodic full reset after ${RESET_AFTER_RESPONSES} responses`,
      );
      this.performFullReset();
      this.responsesSinceReset = 0;
    }

    // NOTE: suspend()->resume() was intentionally REMOVED here.
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
    this.totalReceivedSamples = 0;
    this.isPaused = false;
    this.hasResponseCompleted = false;
    this.firstChunkWallTimeMs = null;
    this.speakingStartWallTimeMs = null;
    this.speakingStartContextTime = null;
    this.startupReason = null;
    this.startupProfile = "deferred_until_complete";
    this.targetPlaybackRate = NORMAL_PLAYBACK_RATE;
    this.activePlaybackRate = NORMAL_PLAYBACK_RATE;
    this.turnTraceId = traceId ?? `resp-${this.responseId}`;
    this.deferStartUntilGenerationComplete = IS_ANDROID;
    this.underrunRiskCount = 0;
    this.starvationEventCount = 0;
    this.queueLowWatermarkSeconds = Number.POSITIVE_INFINITY;
    this.lastRateEvalAtMs = null;
    this.lastRateEvalReceivedSeconds = 0;
    this.sustainedHealthyWindows = 0;
    this.sawSlowRateWindow = false;
    this.rateWindowMin = Number.POSITIVE_INFINITY;
    this.rateWindowMax = 0;
    this.rateWindowSum = 0;
    this.rateWindowCount = 0;
    this.maxDeferTimeoutLogged = false;
    this.turnActivityEndAtMs = activityEndAtMs ?? null;
    this.startupSlaLogged = false;
    this.clearDelayedStartTimer();
    this.clearQueueHeartbeat();

    const exitState = this.audioContext?.state ?? "null";
    const exitTime = this.audioContext?.currentTime ?? 0;
    Logger.info(
      TAG,
      `[DIAG] Prepared response #${this.responseId} trace=${this.turnTraceId} ctx.state=${exitState} ctx.time=${exitTime.toFixed(3)}`,
    );
  }

  private performFullReset(): void {
    Logger.info(TAG, "Full reset - recreating AudioContext");

    // Close and recreate AudioContext to release all native resources.
    // NOTE: stop() is intentionally omitted - it writes directly to native
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

    Logger.info(TAG, `Full reset done - ctx=${this.audioContext.state}`);
  }

  private stopCurrentPlayback(): void {
    this.clearWatchdog();
    this.clearQueueHeartbeat();

    // Cancel gain automations to prevent stale ramps affecting next response
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(0);
      this.gainNode.gain.value = 1.0;
    }

    // NOTE: stop() is intentionally omitted - see performFullReset() comment.
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
      Logger.warn(
        TAG,
        `Cannot create queueSource - ctx=${!!this.audioContext} gain=${!!this.gainNode}`,
      );
      return;
    }

    // CRITICAL: Fully cleanup old queue source to prevent degradation.
    // NOTE: stop() is intentionally omitted - see performFullReset() comment.
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

    // Use native callback for reliable completion/starvation detection
    const currentResponseId = this.responseId;
    this.queueSource.onEnded = (event: {
      bufferId: string | undefined;
      isLast: boolean | undefined;
    }) => {
      // Only act on isLast from the current response
      if (!event.isLast || this.responseId !== currentResponseId) return;
      if (!this.isGenerationComplete) {
        this.starvationEventCount++;
        this.underrunRiskCount++;
        const remainingSeconds = this.estimateQueueRemainingSeconds();
        const rateWindowAvg =
          this.rateWindowCount > 0
            ? this.rateWindowSum / this.rateWindowCount
            : 0;
        Logger.warn(
          TAG,
          `[DIAG] stage=playback_starvation trace=${this.turnTraceId} resp=${this.responseId} remaining=${remainingSeconds.toFixed(2)}s rateAvg=${rateWindowAvg.toFixed(2)} profile=${this.startupProfile} appliedRate=${this.activePlaybackRate.toFixed(2)}`,
        );
        return;
      }
      Logger.info(TAG, `onEnded — last buffer done, finishing`);
      this.finishSpeaking();
    };
  }

  /**
   * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
   * (0.2s) before sending to native layer to reduce bridge traffic.
   */
  queueAudio(base64Pcm: string): void {
    if (this.isInterrupted || !this.audioContext || !this.queueSource) {
      if (!this.audioContext || !this.queueSource) {
        Logger.warn(
          TAG,
          `queueAudio dropped - ctx=${!!this.audioContext} src=${!!this.queueSource}`,
        );
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
      this.totalReceivedSamples += int16Array.length;

      if (this.chunkCount === 1) {
        this.firstChunkWallTimeMs = Date.now();
        this.lastRateEvalAtMs = this.firstChunkWallTimeMs;
        this.lastRateEvalReceivedSeconds = 0;
        Logger.debug(
          TAG,
          `[DIAG] First chunk arrived ctx.state=${this.audioContext?.state} ctx.time=${(this.audioContext?.currentTime ?? 0).toFixed(3)}`,
        );
      } else if (AUDIO_DIAG_VERBOSE && this.chunkCount % 50 === 0) {
        const receivedSeconds = this.totalReceivedSamples / SAMPLE_RATE;
        Logger.debug(
          TAG,
          `[DIAG] chunk=${this.chunkCount} recv=${receivedSeconds.toFixed(2)}s queued=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s pending=${(this.accumulatedLength / SAMPLE_RATE).toFixed(2)}s`,
        );
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
      this.maybeStartPlayback();
    } catch (error) {
      Logger.error(TAG, "Error queueing audio", error);
    }
  }

  private getElapsedFromFirstChunkMs(): number {
    if (this.firstChunkWallTimeMs === null) return 0;
    return Date.now() - this.firstChunkWallTimeMs;
  }

  private getElapsedFromTurnEndMs(): number {
    if (this.turnActivityEndAtMs !== null) {
      return Math.max(0, Date.now() - this.turnActivityEndAtMs);
    }
    return this.getElapsedFromFirstChunkMs();
  }

  private evaluateReceiveRate(elapsedMs: number): void {
    if (
      !IS_ANDROID ||
      this.isGenerationComplete ||
      this.lastRateEvalAtMs === null ||
      this.firstChunkWallTimeMs === null
    ) {
      return;
    }

    const now = Date.now();
    const sinceLastEvalMs = now - this.lastRateEvalAtMs;
    if (sinceLastEvalMs < RATE_WINDOW_MS || elapsedMs < MIN_START_DELAY_MS) {
      return;
    }

    const receivedSeconds = this.totalReceivedSamples / SAMPLE_RATE;
    const deltaReceivedSeconds = Math.max(
      0,
      receivedSeconds - this.lastRateEvalReceivedSeconds,
    );
    const windowSeconds = sinceLastEvalMs / 1000;
    const windowRate =
      windowSeconds > 0 ? deltaReceivedSeconds / windowSeconds : 0;

    this.lastRateEvalAtMs = now;
    this.lastRateEvalReceivedSeconds = receivedSeconds;
    this.rateWindowCount++;
    this.rateWindowSum += windowRate;
    this.rateWindowMin = Math.min(this.rateWindowMin, windowRate);
    this.rateWindowMax = Math.max(this.rateWindowMax, windowRate);

    if (windowRate < RATE_WINDOW_SLOW_THRESHOLD) {
      this.sawSlowRateWindow = true;
    }
    if (windowRate >= RATE_WINDOW_MIN_FOR_NORMAL_START) {
      this.sustainedHealthyWindows++;
    } else {
      this.sustainedHealthyWindows = 0;
    }

    if (AUDIO_DIAG_VERBOSE) {
      Logger.debug(
        TAG,
        `[DIAG] trace=${this.turnTraceId} rateWindow=${windowRate.toFixed(2)} healthyWindows=${this.sustainedHealthyWindows} sawSlow=${this.sawSlowRateWindow}`,
      );
    }
  }

  private maybeStartPlayback(): void {
    if (this.hasStartedPlayback || this.totalQueuedSamples <= 0) {
      return;
    }

    const bufferedSeconds = (this.totalQueuedSamples / SAMPLE_RATE).toFixed(2);
    const bufferedSecondsNum = this.totalQueuedSamples / SAMPLE_RATE;
    const elapsedMs = this.getElapsedFromTurnEndMs();
    const hasMinBuffer = this.totalQueuedSamples >= MIN_INITIAL_BUFFER;
    const delaySatisfied =
      MIN_START_DELAY_MS === 0 || elapsedMs >= MIN_START_DELAY_MS;

    this.evaluateReceiveRate(elapsedMs);
    const rateWindowAvg =
      this.rateWindowCount > 0 ? this.rateWindowSum / this.rateWindowCount : 0;
    const rateWindowMin =
      this.rateWindowCount > 0 ? this.rateWindowMin : Number.POSITIVE_INFINITY;

    if (
      IS_ANDROID &&
      !this.isGenerationComplete &&
      elapsedMs >= STARTUP_SLA_MS &&
      hasMinBuffer
    ) {
      this.startupReason ??= "sla_force_start";
      if (rateWindowAvg >= NORMAL_PLAYBACK_RATE) {
        this.startupProfile = "normal_1x";
        this.targetPlaybackRate = NORMAL_PLAYBACK_RATE;
        this.deferStartUntilGenerationComplete = false;
      } else if (
        rateWindowAvg >= SAFE_PLAYBACK_RATE &&
        ALLOW_ANDROID_QUEUE_RATE_EXPERIMENT
      ) {
        this.startupProfile = "safe_0_8x";
        this.targetPlaybackRate = SAFE_PLAYBACK_RATE;
        this.deferStartUntilGenerationComplete = false;
      } else {
        this.startupProfile = "deferred_until_complete";
        this.deferStartUntilGenerationComplete = true;
      }

      if (!this.startupSlaLogged) {
        Logger.warn(
          TAG,
          `[DIAG] stage=playback_gate_eval trace=${this.turnTraceId} decision=${this.deferStartUntilGenerationComplete ? "defer" : "sla_force_start"} elapsed=${elapsedMs}ms buffered=${bufferedSeconds}s rateAvg=${rateWindowAvg.toFixed(2)}`,
        );
        this.startupSlaLogged = true;
      }
      if (!this.deferStartUntilGenerationComplete) {
        this.startSpeaking();
      }
      return;
    }

    if (IS_ANDROID && !this.isGenerationComplete) {
      const safeAppliedRate =
        this.resolvePlaybackRate(SAFE_PLAYBACK_RATE).appliedRate;
      const safePathUsesNormalRate = safeAppliedRate >= NORMAL_PLAYBACK_RATE;
      const safeMinBufferSeconds = safePathUsesNormalRate
        ? MIN_BUFFER_FOR_EARLY_START_AT_1X
        : SAFE_START_BUFFER_SECONDS_ANDROID;
      const safeMinRate = safePathUsesNormalRate
        ? MIN_RATE_FOR_EARLY_START_AT_1X
        : RATE_WINDOW_MIN_FOR_SAFE_START;
      const safeWindowsRequired = safePathUsesNormalRate
        ? RATE_WINDOWS_REQUIRED
        : 1;
      const hasNormalEarlyBuffer =
        bufferedSecondsNum >= EARLY_START_BUFFER_SECONDS_ANDROID &&
        hasMinBuffer;
      const hasSafeEarlyBuffer =
        bufferedSecondsNum >= safeMinBufferSeconds && hasMinBuffer;
      const canStartNormal =
        hasNormalEarlyBuffer &&
        delaySatisfied &&
        this.sustainedHealthyWindows >= RATE_WINDOWS_REQUIRED &&
        rateWindowAvg >= RATE_WINDOW_MIN_FOR_NORMAL_START;
      const canStartSafe =
        hasSafeEarlyBuffer &&
        delaySatisfied &&
        this.rateWindowCount >= safeWindowsRequired &&
        rateWindowAvg >= safeMinRate &&
        rateWindowMin >= RATE_WINDOW_SEVERE_SLOW;
      const timeoutReached =
        elapsedMs >= MAX_DEFER_MS_ANDROID && hasSafeEarlyBuffer;
      const deferTimeoutExceeded = timeoutReached;

      if (canStartNormal) {
        this.startupReason ??= "sustained_healthy_early_start";
        this.startupProfile = "normal_1x";
        this.targetPlaybackRate = NORMAL_PLAYBACK_RATE;
        this.deferStartUntilGenerationComplete = false;
      } else if (canStartSafe) {
        this.startupReason ??= "safe_buffer_early_start";
        this.startupProfile = "safe_0_8x";
        this.targetPlaybackRate = SAFE_PLAYBACK_RATE;
        this.deferStartUntilGenerationComplete = false;
      } else if (deferTimeoutExceeded) {
        this.startupReason ??= "max_defer_timeout_start";
        this.startupProfile = "safe_0_8x";
        this.targetPlaybackRate = SAFE_PLAYBACK_RATE;
        this.deferStartUntilGenerationComplete = false;
        if (!this.maxDeferTimeoutLogged) {
          Logger.warn(
            TAG,
            `[DIAG] stage=playback_gate_eval trace=${this.turnTraceId} decision=max_defer_timeout_start elapsed=${elapsedMs}ms buffered=${bufferedSeconds}s`,
          );
          this.maxDeferTimeoutLogged = true;
        }
      } else {
        this.deferStartUntilGenerationComplete = true;
        this.startupProfile = "deferred_until_complete";
      }

      if (this.deferStartUntilGenerationComplete) {
        if (AUDIO_DIAG_VERBOSE) {
          Logger.debug(
            TAG,
            `[DIAG] stage=playback_gate_eval trace=${this.turnTraceId} decision=defer buffered=${bufferedSeconds}s elapsed=${elapsedMs}ms healthyWindows=${this.sustainedHealthyWindows} rateAvg=${rateWindowAvg.toFixed(2)} rateMin=${(Number.isFinite(rateWindowMin) ? rateWindowMin : 0).toFixed(2)} sawSlow=${this.sawSlowRateWindow}`,
          );
        }
        return;
      }
    }

    if (hasMinBuffer && delaySatisfied) {
      if (this.startupReason === null) {
        this.startupReason = "normal_buffer_ready";
      }
      if (this.startupProfile === "deferred_until_complete") {
        this.startupProfile = "normal_1x";
      }
      if (this.targetPlaybackRate <= 0) {
        this.targetPlaybackRate = NORMAL_PLAYBACK_RATE;
      }
      Logger.info(
        TAG,
        `Buffer ready - trace=${this.turnTraceId} ${this.chunkCount} chunks, ${bufferedSeconds}s buffered, delay=${elapsedMs}ms, deferred=${this.deferStartUntilGenerationComplete}, profile=${this.startupProfile}, rate=${this.targetPlaybackRate.toFixed(2)}`,
      );
      this.startSpeaking();
      return;
    }

    if (
      hasMinBuffer &&
      MIN_START_DELAY_MS > 0 &&
      elapsedMs < MIN_START_DELAY_MS &&
      this.delayedStartTimerId === null
    ) {
      const remainingMs = MIN_START_DELAY_MS - elapsedMs;
      this.delayedStartTimerId = setTimeout(() => {
        this.delayedStartTimerId = null;
        this.maybeStartPlayback();
      }, remainingMs);
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

  private estimateQueueRemainingSeconds(): number {
    if (!this.audioContext || this.speakingStartContextTime === null) {
      return this.totalQueuedSamples / SAMPLE_RATE;
    }
    const playbackRate =
      this.activePlaybackRate > 0
        ? this.activePlaybackRate
        : NORMAL_PLAYBACK_RATE;
    const consumedSeconds = Math.max(
      0,
      (this.audioContext.currentTime - this.speakingStartContextTime) *
        playbackRate,
    );
    return Math.max(0, this.totalQueuedSamples / SAMPLE_RATE - consumedSeconds);
  }

  private startQueueHeartbeat(): void {
    this.clearQueueHeartbeat();
    this.queueHeartbeatTimerId = setInterval(() => {
      if (!this.isPlaying) return;
      const remainingSeconds = this.estimateQueueRemainingSeconds();
      const pendingSeconds = this.accumulatedLength / SAMPLE_RATE;
      if (AUDIO_DIAG_VERBOSE) {
        Logger.debug(
          TAG,
          `[DIAG] trace=${this.turnTraceId} stream remaining=${remainingSeconds.toFixed(2)}s pending=${pendingSeconds.toFixed(2)}s queued=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s recv=${(this.totalReceivedSamples / SAMPLE_RATE).toFixed(2)}s genDone=${this.isGenerationComplete}`,
        );
      }
      this.queueLowWatermarkSeconds = Math.min(
        this.queueLowWatermarkSeconds,
        remainingSeconds,
      );
      if (!this.isGenerationComplete && remainingSeconds < 0.25) {
        this.underrunRiskCount++;
        this.starvationEventCount++;
        Logger.warn(
          TAG,
          `[DIAG] trace=${this.turnTraceId} Underrun risk #${this.underrunRiskCount} remaining=${remainingSeconds.toFixed(2)}s`,
        );
      }
    }, QUEUE_HEARTBEAT_MS);
  }

  private clearQueueHeartbeat(): void {
    if (this.queueHeartbeatTimerId !== null) {
      clearInterval(this.queueHeartbeatTimerId);
      this.queueHeartbeatTimerId = null;
    }
  }

  private resolvePlaybackRate(requestedRate: number): {
    appliedRate: number;
    guardReason: PlaybackRateGuardReason;
  } {
    if (
      IS_ANDROID &&
      !ALLOW_ANDROID_QUEUE_RATE_EXPERIMENT &&
      requestedRate !== NORMAL_PLAYBACK_RATE
    ) {
      return {
        appliedRate: NORMAL_PLAYBACK_RATE,
        guardReason: "android_queue_rate_guard",
      };
    }

    return { appliedRate: requestedRate, guardReason: "none" };
  }

  private startSpeaking(): void {
    this.clearDelayedStartTimer();
    if (this.isPlaying || !this.queueSource || !this.gainNode) {
      Logger.warn(
        TAG,
        `startSpeaking skipped - playing=${this.isPlaying} src=${!!this.queueSource} gain=${!!this.gainNode}`,
      );
      return;
    }

    this.gainNode.gain.cancelScheduledValues(0);
    const currentTime = this.audioContext?.currentTime ?? 0;
    this.gainNode.gain.setValueAtTime(0, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      1.0,
      currentTime + FADE_IN_DURATION,
    );

    Logger.debug(
      TAG,
      `[DIAG] startSpeaking ctx.state=${this.audioContext?.state} ctx.time=${currentTime.toFixed(3)}`,
    );

    const requestedPlaybackRate =
      this.targetPlaybackRate > 0
        ? this.targetPlaybackRate
        : NORMAL_PLAYBACK_RATE;
    const { appliedRate: playbackRate, guardReason } = this.resolvePlaybackRate(
      requestedPlaybackRate,
    );
    if (guardReason !== "none") {
      Logger.warn(
        TAG,
        `[DIAG] stage=playback_rate_guard trace=${this.turnTraceId} requestedRate=${requestedPlaybackRate.toFixed(2)} appliedRate=${playbackRate.toFixed(2)} reason=${guardReason}`,
      );
    }
    try {
      this.queueSource.playbackRate.setValueAtTime(playbackRate, currentTime);
    } catch (error) {
      Logger.warn(
        TAG,
        `Failed to apply playbackRate=${playbackRate.toFixed(2)}`,
      );
      Logger.debug(TAG, "[DIAG] playbackRate apply error", error);
    }
    this.queueSource.start();

    this.isPlaying = true;
    this.hasStartedPlayback = true;
    this.activePlaybackRate = playbackRate;
    this.speakingStartWallTimeMs = Date.now();
    this.speakingStartContextTime = currentTime;
    this.startQueueHeartbeat();
    this.bufferProgressCallback?.(100);
    if (this.turnActivityEndAtMs !== null && !this.startupSlaLogged) {
      const startupDelayMs = Math.max(0, Date.now() - this.turnActivityEndAtMs);
      Logger.info(
        TAG,
        `[DIAG] stage=playback_startup_sla trace=${this.turnTraceId} activityEndToSpeakMs=${startupDelayMs} slaMs=${STARTUP_SLA_MS} breach=${startupDelayMs > STARTUP_SLA_MS}`,
      );
      this.startupSlaLogged = true;
    }
    Logger.info(
      TAG,
      `>>> SPEAKING started - trace=${this.turnTraceId} resp=#${this.responseId} buffered=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s startupReason=${this.startupReason ?? "unknown"} startupProfile=${this.startupProfile} requestedPlaybackRate=${requestedPlaybackRate.toFixed(2)} playbackRate=${playbackRate.toFixed(2)} ctx.state=${this.audioContext?.state} ctx.time=${currentTime.toFixed(3)}`,
    );
    Logger.info(
      TAG,
      `[DIAG] stage=playback_start trace=${this.turnTraceId} resp=${this.responseId} profile=${this.startupProfile} rate=${playbackRate.toFixed(2)} buffered=${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(2)}s`,
    );
    this.speakingStateCallback?.(true);

    const watchdogResponseId = this.responseId;
    const startCurrentTime = this.audioContext?.currentTime ?? 0;

    this.clearWatchdog();
    this.watchdogTimerId = setTimeout(() => {
      if (this.responseId !== watchdogResponseId || !this.isPlaying) return;
      const nowCurrentTime = this.audioContext?.currentTime ?? 0;
      const delta = nowCurrentTime - startCurrentTime;
      Logger.debug(
        TAG,
        `[DIAG] WATCHDOG check start=${startCurrentTime.toFixed(3)} now=${nowCurrentTime.toFixed(3)} delta=${delta.toFixed(3)}`,
      );
      if (delta < 0.1) {
        Logger.warn(
          TAG,
          `WATCHDOG: Stalled delta=${delta.toFixed(3)} - full reset`,
        );
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
      Logger.debug(TAG, "onGenerationComplete - ignored (interrupted)");
      return;
    }

    this.isGenerationComplete = true;

    if (this.accumulatedLength > 0) {
      this.flushAccumulatedBuffer();
    }

    const totalSeconds = (this.totalQueuedSamples / SAMPLE_RATE).toFixed(2);
    Logger.info(
      TAG,
      `Generation complete - trace=${this.turnTraceId} ${this.chunkCount} chunks, ${this.flushCount} flushes, ${totalSeconds}s total, playing=${this.isPlaying}, deferred=${this.deferStartUntilGenerationComplete}`,
    );

    if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
      const elapsedMs = this.getElapsedFromTurnEndMs();
      const remainingMs = Math.max(0, MIN_START_DELAY_MS - elapsedMs);
      if (IS_ANDROID) {
        const rateWindowAvg =
          this.rateWindowCount > 0
            ? this.rateWindowSum / this.rateWindowCount
            : 0;
        if (
          rateWindowAvg > 0 &&
          rateWindowAvg < RATE_WINDOW_MIN_FOR_NORMAL_START
        ) {
          this.startupProfile = "safe_0_8x";
          this.targetPlaybackRate = SAFE_PLAYBACK_RATE;
        } else {
          this.startupProfile = "normal_1x";
          this.targetPlaybackRate = NORMAL_PLAYBACK_RATE;
        }
      }
      if (remainingMs > 0) {
        this.startupReason = "generation_complete_late_start";
        Logger.info(
          TAG,
          `Short response - waiting ${remainingMs}ms before late playback`,
        );
        this.clearDelayedStartTimer();
        this.delayedStartTimerId = setTimeout(() => {
          this.delayedStartTimerId = null;
          if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
            this.startSpeaking();
          }
        }, remainingMs);
        return;
      }
      this.startupReason = "generation_complete_late_start";
      Logger.info(TAG, "Short/deferred response - starting late playback");
      this.startSpeaking();
    }
  }

  private finishSpeaking(): void {
    if (!this.isPlaying) return;
    this.clearWatchdog();
    this.clearQueueHeartbeat();

    const totalSeconds = (this.totalQueuedSamples / SAMPLE_RATE).toFixed(2);
    const speakMs =
      this.speakingStartWallTimeMs !== null
        ? Date.now() - this.speakingStartWallTimeMs
        : 0;
    const startupWaitMs =
      this.speakingStartWallTimeMs !== null &&
      this.firstChunkWallTimeMs !== null
        ? this.speakingStartWallTimeMs - this.firstChunkWallTimeMs
        : -1;
    const rateWindowAvg =
      this.rateWindowCount > 0 ? this.rateWindowSum / this.rateWindowCount : 0;
    const rateWindowMin = this.rateWindowCount > 0 ? this.rateWindowMin : 0;
    const issue: StreamIssueClassification =
      rateWindowAvg < RATE_WINDOW_MIN_FOR_SAFE_START ||
      rateWindowMin < RATE_WINDOW_SEVERE_SLOW
        ? "api_or_network_slow_stream"
        : this.starvationEventCount > 0
          ? "client_processing_backpressure"
          : "healthy_stream";
    Logger.info(
      TAG,
      `<<< SPEAKING finished - trace=${this.turnTraceId} resp=#${this.responseId} ${this.chunkCount} chunks, ${this.flushCount} flushes, ${totalSeconds}s, speakMs=${speakMs}, startupWaitMs=${startupWaitMs}, startupReason=${this.startupReason ?? "unknown"}, startupProfile=${this.startupProfile}, playbackRate=${this.activePlaybackRate.toFixed(2)}, underrunRisk=${this.underrunRiskCount}, starvation=${this.starvationEventCount}, lowWatermark=${(Number.isFinite(this.queueLowWatermarkSeconds) ? this.queueLowWatermarkSeconds : 0).toFixed(2)}s, rateAvg=${rateWindowAvg.toFixed(2)}, rateMin=${rateWindowMin.toFixed(2)}, rateMax=${this.rateWindowMax.toFixed(2)}, issue=${issue}`,
    );
    Logger.info(
      TAG,
      `[DIAG] stage=playback_finish trace=${this.turnTraceId} resp=${this.responseId} profile=${this.startupProfile} rate=${this.activePlaybackRate.toFixed(2)} startupWaitMs=${startupWaitMs} speakMs=${speakMs} issue=${issue}`,
    );

    this.hasResponseCompleted = true;

    if (this.queueSource) {
      try {
        this.queueSource.clearBuffers();
      } catch {}
    }

    this.resetState();
    this.speakingStateCallback?.(false);
  }

  private resetState(): void {
    this.clearDelayedStartTimer();
    this.clearQueueHeartbeat();
    this.isPlaying = false;
    this.isGenerationComplete = false;
    this.hasStartedPlayback = false;
    this.chunkCount = 0;
    this.flushCount = 0;
    this.totalReceivedSamples = 0;
    this.speakingStartWallTimeMs = null;
    this.speakingStartContextTime = null;
    this.startupReason = null;
    this.startupProfile = "deferred_until_complete";
    this.targetPlaybackRate = NORMAL_PLAYBACK_RATE;
    this.activePlaybackRate = NORMAL_PLAYBACK_RATE;
    this.turnTraceId = "turn-unknown";
    this.deferStartUntilGenerationComplete = IS_ANDROID;
    this.underrunRiskCount = 0;
    this.starvationEventCount = 0;
    this.queueLowWatermarkSeconds = Number.POSITIVE_INFINITY;
    this.lastRateEvalAtMs = null;
    this.lastRateEvalReceivedSeconds = 0;
    this.sustainedHealthyWindows = 0;
    this.sawSlowRateWindow = false;
    this.rateWindowMin = Number.POSITIVE_INFINITY;
    this.rateWindowMax = 0;
    this.rateWindowSum = 0;
    this.rateWindowCount = 0;
    this.maxDeferTimeoutLogged = false;
    this.turnActivityEndAtMs = null;
    this.startupSlaLogged = false;

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

  private clearDelayedStartTimer(): void {
    if (this.delayedStartTimerId !== null) {
      clearTimeout(this.delayedStartTimerId);
      this.delayedStartTimerId = null;
    }
  }

  handleInterruption(): void {
    Logger.info(TAG, "Interrupted");
    this.clearWatchdog();
    this.clearDelayedStartTimer();
    this.clearQueueHeartbeat();
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
    this.clearQueueHeartbeat();
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
    this.speakingStartContextTime = this.audioContext.currentTime;
    this.startQueueHeartbeat();
    this.isPlaying = true;
    this.isPaused = false;
    this.speakingStateCallback?.(true);
  }

  dispose(): void {
    Logger.info(TAG, "Disposed");
    this.clearWatchdog();
    this.clearDelayedStartTimer();
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
