import { filterTranscriptText } from "@/utils/filterTranscriptText";
import { audioStreamer } from "../audio/streamer";
import { Logger } from "../common/Logger";
import {
  ConnectionState,
  GeminiClientContent,
  GeminiError,
  GeminiErrorType,
  GeminiRealtimeInput,
  GeminiServerResponse,
} from "./types";

// Lazy getter to break circular dependency with conversationStore
const getConversationStore = () =>
  require("../../stores/conversationStore").useConversationStore;

const TAG = "GeminiWS";
const DEFAULT_MODEL_PRIMARY =
  "models/gemini-2.5-flash-native-audio-preview-12-2025";
const DEFAULT_MODEL_FALLBACK = DEFAULT_MODEL_PRIMARY;
const MODEL_PRIMARY =
  process.env.EXPO_PUBLIC_GEMINI_LIVE_MODEL_PRIMARY || DEFAULT_MODEL_PRIMARY;
const MODEL_FALLBACK =
  process.env.EXPO_PUBLIC_GEMINI_LIVE_MODEL_FALLBACK || DEFAULT_MODEL_FALLBACK;
const STARTUP_SLA_MS = Number(
  process.env.EXPO_PUBLIC_STARTUP_SLA_MS ?? "10000",
);
const STARTUP_RISK_MS = Math.max(1000, Math.min(7000, STARTUP_SLA_MS - 2000));
const envMaxTokens = process.env.EXPO_PUBLIC_GEMINI_MAX_OUTPUT_TOKENS;
const MAX_OUTPUT_TOKENS = envMaxTokens ? Number(envMaxTokens) : 2048;

const MAX_OUTPUT_TOKENS_SAFE =
  Number.isFinite(MAX_OUTPUT_TOKENS) && MAX_OUTPUT_TOKENS > 0
    ? Math.floor(MAX_OUTPUT_TOKENS)
    : 2048;
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const AUDIO_DIAG_VERBOSE = process.env.EXPO_PUBLIC_AUDIO_DIAG === "1";
const MODEL_AUDIO_SAMPLE_RATE = 24000;
const PCM_BYTES_PER_SAMPLE = 2;
const WS_BUFFERED_LOG_CHUNK_INTERVAL = 50;

type TurnIssueClassification =
  | "healthy_stream"
  | "api_or_network_slow_stream"
  | "client_processing_backpressure";
type TurnIssueReason =
  | "healthy"
  | "model_rate_low"
  | "model_rate_severe_low"
  | "model_gap_high"
  | "ws_send_backpressure";

class GeminiWebSocket {
  private ws: WebSocket | null = null;
  private url =
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
  private connectionState: ConnectionState = "idle";
  private isSetupComplete = false;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastApiKey: string = "";
  private lastInstruction: string = "";
  private lastInitialPrompt?: string; // Store initial prompt for reconnection
  private audioChunksSent = 0;
  private isFirstAudioChunk = true; // Track first audio chunk for prepareForNewResponse
  private isAudioOnlyMode = false; // Skip conversation updates during audio-only playback (Vocab TTS)
  private audioChunksReceived = 0; // [DIAG] Count audio chunks received from model
  private pendingModelTranscript = "";
  private hasAudioInCurrentTurn = false;
  private awaitingSpeechEndToFlushText = false;
  private activityStartAtMs: number | null = null;
  private activityEndAtMs: number | null = null;
  private firstModelAudioChunkAtMs: number | null = null;
  private lastModelAudioChunkAtMs: number | null = null;
  private modelAudioGapTotalMs = 0;
  private modelAudioGapMaxMs = 0;
  private modelAudioGapCount = 0;
  private modelAudioBytesReceived = 0;
  private wsBufferedAmountMax = 0;
  private wsBufferedAmountTotal = 0;
  private wsBufferedAmountSamples = 0;
  private turnTraceId = "turn-unknown";
  private turnSequence = 0;
  private currentModel = MODEL_PRIMARY;
  private startupRiskTimerId: ReturnType<typeof setTimeout> | null = null;
  private startupDeadlineTimerId: ReturnType<typeof setTimeout> | null = null;
  private startupSlaAnchorMs: number | null = null;
  private hasPlaybackStartedInTurn = false;
  private turnInputTranscript = "";
  private fastRetryTriggeredForTurn = false;
  private pendingClientMessageAfterSetup: GeminiClientContent | null = null;
  private pendingTraceIdAfterSetup: string | null = null;
  private lastBaseInstruction: string = "";
  private slowTurnStreak = 0;
  private rotationCooldownUntilMs = 0;
  private discardModelOutputWhilePTT = false;
  private suppressedModelAudioChunks = 0;
  private pendingHealthRotationIssue: {
    issue: TurnIssueClassification;
    reason: TurnIssueReason;
  } | null = null;

  // Singleton
  private static instance: GeminiWebSocket;
  private constructor() {}
  public static getInstance(): GeminiWebSocket {
    if (!GeminiWebSocket.instance) {
      GeminiWebSocket.instance = new GeminiWebSocket();
    }
    return GeminiWebSocket.instance;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isReady(): boolean {
    return this.connectionState === "connected" && this.isSetupComplete;
  }

  private handleSpeakingStateChange(isSpeaking: boolean): void {
    const store = getConversationStore().getState();
    store.setSpeaking(isSpeaking);

    if (isSpeaking) {
      this.hasPlaybackStartedInTurn = true;
      this.clearStartupTimers();
      if (this.startupSlaAnchorMs !== null) {
        const startupDelayMs = Date.now() - this.startupSlaAnchorMs;
        Logger.info(
          TAG,
          `[DIAG] stage=playback_startup_sla trace=${this.turnTraceId} activityEndToSpeakMs=${startupDelayMs} slaMs=${STARTUP_SLA_MS} breach=${startupDelayMs > STARTUP_SLA_MS}`,
        );
      }
    }

    // Keep transcript hidden while Sophie is speaking, then flush once finished.
    if (!isSpeaking && this.awaitingSpeechEndToFlushText) {
      const deferredRotationIssue = this.pendingHealthRotationIssue;
      this.flushPendingModelTranscript();
      this.pendingHealthRotationIssue = null;
      if (deferredRotationIssue) {
        this.maybeRotateSessionForHealth(deferredRotationIssue);
      }
    }
  }

  private queueModelTranscript(rawText: string): void {
    const text = filterTranscriptText(rawText.trim());
    if (!text) return;

    if (!this.pendingModelTranscript) {
      this.pendingModelTranscript = text;
      return;
    }

    if (text === this.pendingModelTranscript) {
      return;
    }

    // Gemini usually sends cumulative transcription updates.
    if (text.startsWith(this.pendingModelTranscript)) {
      this.pendingModelTranscript = text;
      return;
    }

    // Fallback for fragmented non-cumulative chunks.
    this.pendingModelTranscript =
      `${this.pendingModelTranscript} ${text}`.trim();
  }

  private flushPendingModelTranscript(): void {
    if (this.pendingModelTranscript && !this.isAudioOnlyMode) {
      Logger.info(
        TAG,
        `Model transcript finalized (${this.pendingModelTranscript.length} chars)`,
      );
      getConversationStore()
        .getState()
        .addMessage("model", this.pendingModelTranscript);
    }
    this.resetModelTurnBuffer();
  }

  private resetModelTurnBuffer(): void {
    this.pendingModelTranscript = "";
    this.hasAudioInCurrentTurn = false;
    this.awaitingSpeechEndToFlushText = false;
    this.pendingHealthRotationIssue = null;
    this.discardModelOutputWhilePTT = false;
    this.suppressedModelAudioChunks = 0;
    this.isAudioOnlyMode = false;
    this.turnTraceId = "turn-unknown";
    this.turnInputTranscript = "";
    this.hasPlaybackStartedInTurn = false;
    this.startupSlaAnchorMs = null;
    this.fastRetryTriggeredForTurn = false;
    this.clearStartupTimers();
    this.resetTurnStreamMetrics();
  }

  private resetTurnStreamMetrics(): void {
    this.firstModelAudioChunkAtMs = null;
    this.lastModelAudioChunkAtMs = null;
    this.modelAudioGapTotalMs = 0;
    this.modelAudioGapMaxMs = 0;
    this.modelAudioGapCount = 0;
    this.modelAudioBytesReceived = 0;
    this.wsBufferedAmountMax = 0;
    this.wsBufferedAmountTotal = 0;
    this.wsBufferedAmountSamples = 0;
  }

  private buildTurnTraceId(prefix: string): string {
    this.turnSequence += 1;
    return `${prefix}-${this.turnSequence}-${Date.now()}`;
  }

  private clearStartupTimers(): void {
    if (this.startupRiskTimerId !== null) {
      clearTimeout(this.startupRiskTimerId);
      this.startupRiskTimerId = null;
    }
    if (this.startupDeadlineTimerId !== null) {
      clearTimeout(this.startupDeadlineTimerId);
      this.startupDeadlineTimerId = null;
    }
  }

  private armStartupTimers(): void {
    this.clearStartupTimers();
    if (this.startupSlaAnchorMs === null) return;

    this.startupRiskTimerId = setTimeout(() => {
      if (this.hasPlaybackStartedInTurn) return;
      Logger.warn(
        TAG,
        `[DIAG] stage=startup_deadline_risk trace=${this.turnTraceId} elapsed=${Date.now() - this.startupSlaAnchorMs!}ms`,
      );
      this.triggerFastRetry("startup_deadline_risk");
    }, STARTUP_RISK_MS);

    this.startupDeadlineTimerId = setTimeout(() => {
      if (this.hasPlaybackStartedInTurn) return;
      Logger.warn(
        TAG,
        `[DIAG] stage=startup_deadline_timeout trace=${this.turnTraceId} elapsed=${Date.now() - this.startupSlaAnchorMs!}ms`,
      );
      this.triggerFastRetry("startup_deadline_timeout");
    }, STARTUP_SLA_MS);
  }

  private buildCompactMemorySnippet(): string {
    const messages = getConversationStore().getState().messages;
    if (messages.length === 0) return "";

    const lastMessages = messages.slice(-4);
    const olderMessages = messages.slice(0, -4);
    const olderDigest = olderMessages
      .map(
        (msg: { role: "user" | "model"; text: string }) =>
          `${msg.role}: ${msg.text}`,
      )
      .join(" ")
      .slice(-500);
    const recentTurns = lastMessages
      .map(
        (msg: { role: "user" | "model"; text: string }) =>
          `${msg.role.toUpperCase()}: ${msg.text}`,
      )
      .join("\n");

    return [
      "CONTEXT CONTINUITY CAPSULE:",
      olderDigest ? `Earlier summary: ${olderDigest}` : "Earlier summary: n/a",
      "Most recent turns:",
      recentTurns || "n/a",
    ].join("\n");
  }

  private buildFastRetryPrompt(userText: string): GeminiClientContent {
    return {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `User said: "${userText}". Reply immediately with at most 2 short sentences in voice. Keep it natural and direct.`,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };
  }

  private reconnectWithInstruction(
    instruction: string,
    pendingMessage: GeminiClientContent | null,
    pendingTraceId: string | null,
  ): void {
    if (!this.lastApiKey) return;

    const previousSlaAnchor = this.startupSlaAnchorMs;
    this.pendingClientMessageAfterSetup = pendingMessage;
    this.pendingTraceIdAfterSetup = pendingTraceId;
    this.disconnect();
    this.startupSlaAnchorMs = previousSlaAnchor;
    this.connectInternal(this.lastApiKey, instruction, undefined, false);
  }

  private maybeRotateSessionForHealth(turnIssue: {
    issue: TurnIssueClassification;
    reason: TurnIssueReason;
  }): void {
    if (turnIssue.issue === "api_or_network_slow_stream") {
      this.slowTurnStreak += 1;
    } else {
      this.slowTurnStreak = 0;
    }

    const requiredStreak = turnIssue.reason === "model_rate_severe_low" ? 1 : 2;
    if (this.slowTurnStreak < requiredStreak) return;
    if (Date.now() < this.rotationCooldownUntilMs) return;
    if (!this.lastApiKey || !this.lastBaseInstruction) return;

    const nextModel =
      this.currentModel === MODEL_PRIMARY ? MODEL_FALLBACK : MODEL_PRIMARY;

    const memorySnippet = this.buildCompactMemorySnippet();
    const rotatedInstruction = [
      this.lastBaseInstruction,
      "",
      "SYSTEM UPDATE: Keep responses short (max 2 short sentences).",
      memorySnippet,
    ]
      .filter(Boolean)
      .join("\n");
    this.rotationCooldownUntilMs = Date.now() + 60_000;
    this.slowTurnStreak = 0;
    this.currentModel = nextModel;
    Logger.warn(
      TAG,
      `[DIAG] stage=session_rotate_start trace=${this.turnTraceId} reason=persistent_slow_stream model=${this.currentModel}`,
    );
    this.reconnectWithInstruction(rotatedInstruction, null, null);
  }

  private triggerFastRetry(reason: string): void {
    if (this.fastRetryTriggeredForTurn || this.hasPlaybackStartedInTurn) {
      return;
    }
    if (!this.lastApiKey || !this.lastBaseInstruction) {
      Logger.warn(
        TAG,
        `[DIAG] stage=startup_fast_retry_skipped trace=${this.turnTraceId} reason=${reason} missing_session_state=true`,
      );
      return;
    }

    const fallbackUserText = this.turnInputTranscript.trim();
    if (!fallbackUserText) {
      Logger.warn(
        TAG,
        `[DIAG] stage=startup_fast_retry_skipped trace=${this.turnTraceId} reason=${reason} missing_transcript=true`,
      );
      return;
    }

    this.fastRetryTriggeredForTurn = true;
    const retryTraceId = this.buildTurnTraceId("retry");
    this.currentModel = MODEL_PRIMARY;
    Logger.warn(
      TAG,
      `[DIAG] stage=startup_fast_retry trace=${this.turnTraceId} retryTrace=${retryTraceId} reason=${reason}`,
    );

    audioStreamer.handleInterruption();
    this.resetTurnStreamMetrics();
    this.hasAudioInCurrentTurn = false;
    this.isFirstAudioChunk = true;
    this.hasPlaybackStartedInTurn = false;
    this.turnTraceId = retryTraceId;

    const memorySnippet = this.buildCompactMemorySnippet();
    const retryInstruction = [
      this.lastBaseInstruction,
      "",
      "SYSTEM UPDATE: PRIORITIZE LATENCY. Reply in at most 2 short sentences.",
      memorySnippet,
    ]
      .filter(Boolean)
      .join("\n");
    const retryMessage = this.buildFastRetryPrompt(fallbackUserText);
    this.reconnectWithInstruction(retryInstruction, retryMessage, retryTraceId);
    this.armStartupTimers();
  }

  private classifyTurnIssue(
    avgGapMs: number,
    modelRealtimeRatio: number,
    wsBufferedAvgBytes: number,
    wsBufferedMaxBytes: number,
  ): { issue: TurnIssueClassification; reason: TurnIssueReason } {
    if (modelRealtimeRatio < 0.65) {
      return {
        issue: "api_or_network_slow_stream",
        reason: "model_rate_severe_low",
      };
    }
    if (modelRealtimeRatio < 0.9) {
      return { issue: "api_or_network_slow_stream", reason: "model_rate_low" };
    }
    if (avgGapMs > 140) {
      return { issue: "api_or_network_slow_stream", reason: "model_gap_high" };
    }
    if (wsBufferedAvgBytes > 32768 || wsBufferedMaxBytes > 131072) {
      return {
        issue: "client_processing_backpressure",
        reason: "ws_send_backpressure",
      };
    }
    return { issue: "healthy_stream", reason: "healthy" };
  }

  private static estimateBase64DecodedBytes(base64Data: string): number {
    if (!base64Data) return 0;
    let padding = 0;
    if (base64Data.endsWith("==")) {
      padding = 2;
    } else if (base64Data.endsWith("=")) {
      padding = 1;
    }
    return Math.max(0, Math.floor((base64Data.length * 3) / 4) - padding);
  }

  private sampleWsBufferedAmount(stage: string): void {
    const bufferedAmount =
      typeof this.ws?.bufferedAmount === "number" ? this.ws.bufferedAmount : 0;
    this.wsBufferedAmountMax = Math.max(
      this.wsBufferedAmountMax,
      bufferedAmount,
    );
    this.wsBufferedAmountTotal += bufferedAmount;
    this.wsBufferedAmountSamples++;

    if (
      AUDIO_DIAG_VERBOSE &&
      (this.audioChunksSent <= 2 ||
        this.audioChunksSent % WS_BUFFERED_LOG_CHUNK_INTERVAL === 0 ||
        bufferedAmount > 0)
    ) {
      Logger.debug(
        TAG,
        `[DIAG] stage=${stage} trace=${this.turnTraceId} chunkSent=${this.audioChunksSent} wsBuffered=${bufferedAmount}`,
      );
    }
  }

  private setConnectionState(state: ConnectionState, error?: GeminiError) {
    this.connectionState = state;
    const store = getConversationStore().getState();
    store.setConnectionState(state);
    if (error) {
      store.setError(error.message);
    } else if (state === "connected") {
      store.setError(null);
    }
  }

  private categorizeError(code?: number, message?: string): GeminiError {
    const parsedCode =
      typeof code === "number"
        ? code
        : typeof code === "string"
          ? Number(code)
          : Number.NaN;
    const normalizedCode = Number.isFinite(parsedCode) ? parsedCode : undefined;
    let type: GeminiErrorType = "unknown";
    let retryable = false;

    if (normalizedCode === 1000) {
      type = "connection";
      retryable = false;
    } else if (normalizedCode === 1006 || normalizedCode === 1011) {
      type = "connection";
      retryable = true;
    } else if (normalizedCode === 401 || normalizedCode === 403) {
      type = "auth";
      retryable = false;
    } else if (normalizedCode === 429) {
      type = "rate_limit";
      retryable = true;
    } else if (
      normalizedCode !== undefined &&
      normalizedCode >= 500 &&
      normalizedCode < 600
    ) {
      type = "server";
      retryable = true;
    }

    return {
      type,
      message: message || "Connection error",
      code: normalizedCode,
      retryable,
    };
  }

  private isUnsupportedModelClose(code?: number, reason?: string): boolean {
    const normalizedCode = Number.isFinite(code) ? code : undefined;
    if (normalizedCode !== 1008) return false;
    if (!reason) return false;
    return (
      reason.includes("is not found for API version") ||
      reason.includes("not supported for bidiGenerateContent")
    );
  }

  private maybeFallbackModelOnUnsupportedClose(reason?: string): boolean {
    if (!this.isUnsupportedModelClose(1008, reason)) return false;
    if (!MODEL_FALLBACK || MODEL_FALLBACK === this.currentModel) return false;
    this.currentModel = MODEL_FALLBACK;
    this.reconnectAttempts = 0;
    Logger.warn(
      TAG,
      `[DIAG] stage=model_fallback_on_close nextModel=${this.currentModel}`,
    );
    return true;
  }

  connect(apiKey: string, systemInstruction: string, initialPrompt?: string) {
    this.connectInternal(apiKey, systemInstruction, initialPrompt, true);
  }

  private connectInternal(
    apiKey: string,
    systemInstruction: string,
    initialPrompt?: string,
    updateBaseInstruction: boolean = true,
  ): void {
    // Clear any pending reconnect
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Already connected or connecting
    if (
      this.ws &&
      (this.connectionState === "connected" ||
        this.connectionState === "connecting")
    ) {
      Logger.warn(TAG, "WebSocket already connected or connecting");
      return;
    }

    // Store for reconnection
    this.lastApiKey = apiKey;
    this.lastInstruction = systemInstruction;
    if (updateBaseInstruction) {
      this.lastBaseInstruction = systemInstruction;
      this.currentModel = MODEL_PRIMARY;
      this.slowTurnStreak = 0;
      this.rotationCooldownUntilMs = 0;
    }
    this.lastInitialPrompt = initialPrompt; // Store initial prompt

    this.setConnectionState("connecting");
    Logger.info(
      TAG,
      `Connecting to Gemini Live API with model ${this.currentModel}...`,
    );

    try {
      const wsUrl = `${this.url}?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        Logger.info(TAG, "WebSocket Connected successfully");
        this.audioChunksSent = 0;
        this.audioChunksReceived = 0;
        this.isSetupComplete = false;
        this.sendSetupMessage(systemInstruction);
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (this.ws !== ws) return;

        try {
          let data = event.data;

          // Handle different data types React Native might send
          if (data instanceof Blob) {
            data = await data.text();
          } else if (data instanceof ArrayBuffer) {
            const decoder = new TextDecoder("utf-8");
            data = decoder.decode(data);
          } else if (typeof data === "object" && data !== null) {
            data = JSON.stringify(data);
          }

          if (typeof data === "string") {
            const response = JSON.parse(data) as GeminiServerResponse;
            this.handleMessage(response);
          }
        } catch (error) {
          Logger.error(TAG, "Error parsing WebSocket message", error);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        if (this.ws === ws) {
          const closeCode =
            typeof event.code === "number" ? event.code : Number(event.code);
          const normalizedCloseCode = Number.isFinite(closeCode)
            ? closeCode
            : undefined;
          const closeReason = event.reason || "Connection closed";

          if (
            this.isUnsupportedModelClose(normalizedCloseCode, closeReason) &&
            this.maybeFallbackModelOnUnsupportedClose(closeReason)
          ) {
            Logger.warn(
              TAG,
              `WebSocket closed due to unsupported model. Retrying with fallback model ${this.currentModel}.`,
            );
            this.ws = null;
            this.isSetupComplete = false;
            this.clearStartupTimers();
            this.hasPlaybackStartedInTurn = false;
            this.startupSlaAnchorMs = null;
            this.fastRetryTriggeredForTurn = false;
            this.scheduleReconnect();
            return;
          }

          const geminiError = this.categorizeError(
            normalizedCloseCode,
            closeReason,
          );

          if (normalizedCloseCode === 1000) {
            Logger.info(TAG, "WebSocket Closed Gracefully (1000)");
            this.setConnectionState("idle");
          } else {
            Logger.warn(
              TAG,
              `WebSocket Closed. Code: ${normalizedCloseCode ?? -1}, Reason: ${closeReason || "No reason provided"}`,
            );

            // Attempt reconnection if retryable
            if (
              geminiError.retryable &&
              this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS
            ) {
              this.scheduleReconnect();
            } else {
              this.setConnectionState("error", geminiError);
            }
          }

          this.isSetupComplete = false;
          this.ws = null;
          this.clearStartupTimers();
          this.hasPlaybackStartedInTurn = false;
          this.startupSlaAnchorMs = null;
          this.fastRetryTriggeredForTurn = false;
        } else {
          Logger.debug(TAG, "Ignored onclose for old WebSocket instance");
        }
      };

      ws.onerror = (error: Event) => {
        if (this.ws !== ws) return;
        Logger.error(TAG, "WebSocket Error", error);
      };
    } catch (error) {
      Logger.error(TAG, "Failed to initialize WebSocket", error);
      this.setConnectionState("error", {
        type: "connection",
        message: "Failed to initialize connection",
        retryable: false,
      });
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      10000,
    );

    Logger.info(
      TAG,
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`,
    );
    this.setConnectionState("reconnecting");

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      if (this.lastApiKey && this.lastInstruction) {
        this.connectInternal(
          this.lastApiKey,
          this.lastInstruction,
          this.lastInitialPrompt,
          false,
        );
      }
    }, delay);
  }

  private sendSetupMessage(instruction: string) {
    Logger.info(TAG, "Sending setup message...");
    const defaultInstruction =
      "You are Sophie AI, a friendly AI language tutor. You help users master real-world conversation. When a user makes a mistake, provide a 'Natural Correction'—a more native way to say it—and explain the nuance briefly. Keep your spoken responses short and encouraging. Always respond in the target language unless an English explanation is needed for clarity.";

    // Check if we have already greeted the user in this session
    // If so, we MUST tell Gemini NOT to restart the intro, or it will treat the next input as a fresh start.
    const store = getConversationStore().getState();
    let finalInstruction = instruction || defaultInstruction;

    if (store.hasGreeted) {
      Logger.info(
        TAG,
        "Appending RECONNECT instruction (User has already been greeted)",
      );
      finalInstruction += `
      
      IMPORTANT SYSTEM UPDATE:
      The conversation is resuming after a connection break.
      You have ALREADY greeted the user and introduced the lesson.
      Do NOT repeat the introduction or the greeting.
      Just reply naturally to the user's latest input as if the conversation never stopped.`;
    }

    // IMPORTANT: Gemini API expects camelCase in setup message (not snake_case)
    const setupMsg = {
      setup: {
        model: this.currentModel,
        generationConfig: {
          responseModalities: ["AUDIO"],
          maxOutputTokens: MAX_OUTPUT_TOKENS_SAFE,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede",
              },
            },
          },
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
        systemInstruction: {
          parts: [{ text: finalInstruction }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        // PTT Mode: Disable automatic VAD, use manual activity control
        // Client sends activityStart/activityEnd to control turn-taking
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: true,
          },
          activityHandling: "NO_INTERRUPTION",
        },
      },
    };
    Logger.debug(TAG, `Setup message: ${JSON.stringify(setupMsg)}`);
    this.send(JSON.stringify(setupMsg));
  }

  /**
   * Signal start of user speech activity (PTT pressed).
   */
  sendActivityStart(): void {
    if (!this.isReady()) {
      Logger.warn(TAG, "Cannot send activityStart: not ready");
      return;
    }
    this.activityStartAtMs = Date.now();
    this.turnTraceId = this.buildTurnTraceId("ptt");
    this.resetTurnStreamMetrics();
    this.turnInputTranscript = "";
    this.hasPlaybackStartedInTurn = false;
    this.fastRetryTriggeredForTurn = false;
    this.startupSlaAnchorMs = null;
    this.clearStartupTimers();
    Logger.info(TAG, "Sending activityStart signal");
    Logger.info(
      TAG,
      `[DIAG] stage=activity_start trace=${this.turnTraceId} wsState=${this.ws?.readyState ?? -1}`,
    );
    this.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
  }

  /**
   * Signal end of user speech activity (PTT released).
   */
  sendActivityEnd(): void {
    if (!this.isReady()) {
      Logger.warn(TAG, "Cannot send activityEnd: not ready");
      return;
    }
    this.activityEndAtMs = Date.now();
    this.startupSlaAnchorMs = this.activityEndAtMs;
    this.hasPlaybackStartedInTurn = false;
    this.fastRetryTriggeredForTurn = false;
    Logger.info(TAG, "Sending activityEnd signal");
    Logger.info(
      TAG,
      `[DIAG] stage=activity_end trace=${this.turnTraceId} wsState=${this.ws?.readyState ?? -1}`,
    );
    this.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
    this.armStartupTimers();
  }

  sendAudioChunk(base64Data: string) {
    if (!base64Data || base64Data.length === 0) {
      Logger.warn(TAG, "sendAudioChunk called with empty data");
      return;
    }

    if (!this.isReady()) {
      Logger.warn(
        TAG,
        `Cannot send audio: not ready (state=${this.connectionState})`,
      );
      return;
    }

    // Keep chunk logs sparse to reduce JS log pressure on Android.
    this.audioChunksSent++;
    if (this.audioChunksSent <= 2 || this.audioChunksSent % 200 === 0) {
      Logger.debug(
        TAG,
        `Sending audio chunk #${this.audioChunksSent} (${base64Data.length} chars)`,
      );
    }

    const msg: GeminiRealtimeInput = {
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Data,
        },
      },
    };
    this.send(JSON.stringify(msg));
    this.sampleWsBufferedAmount("audio_send");
  }

  /**
   * Send a greeting request to Sophie. Called from HomeScreen on first mic press.
   */
  sendGreeting() {
    if (!this.isReady()) {
      Logger.warn(TAG, "Cannot send greeting: not ready");
      return;
    }

    Logger.info(TAG, "Requesting Sophie greeting...");
    const defaultPrompt =
      "Say hi and ask me one simple question to start practicing. Keep it under 2 sentences.";
    const text = this.lastInitialPrompt || defaultPrompt;

    const greetingMsg: GeminiClientContent = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [
              {
                text,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };
    this.send(JSON.stringify(greetingMsg));
  }

  /**
   * Speak a phrase aloud using Gemini's TTS capability.
   * Used by Vocab page to pronounce saved vocabulary items.
   * @param phrase The text to speak
   * @param language The language name (e.g., "Hindi", "Spanish")
   * @param audioOnly If true, skip adding to conversation history (for Vocab page)
   * @returns true if request was sent, false if WebSocket not ready
   */
  speakPhrase(
    phrase: string,
    language: string,
    audioOnly: boolean = false,
  ): boolean {
    if (!this.isReady()) {
      Logger.warn(TAG, "Cannot speak phrase: WebSocket not ready");
      return false;
    }

    Logger.info(
      TAG,
      `Speaking phrase in ${language}: ${phrase.substring(0, 50)}...`,
    );

    // Set audio-only mode to skip conversation updates
    this.isAudioOnlyMode = audioOnly;

    // Prepare audio streamer for new audio response
    this.turnTraceId = this.buildTurnTraceId("tts");
    Logger.info(TAG, `[DIAG] stage=tts_start trace=${this.turnTraceId}`);
    audioStreamer.prepareForNewResponse(this.turnTraceId);
    this.isFirstAudioChunk = true; // Reset for incoming audio

    const speakMsg: GeminiClientContent = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `Speak this ${language} phrase naturally and clearly, exactly as written. Do not add anything else, just speak the phrase: "${phrase}"`,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };
    this.send(JSON.stringify(speakMsg));
    return true;
  }

  /**
   * Initialize audio streamer and send greeting on first connection.
   * Audio streamer must be initialized before greeting to avoid dropped audio chunks.
   */
  private async initializeAndGreet(store: {
    hasGreeted: boolean;
    setHasGreeted: (v: boolean) => void;
  }): Promise<void> {
    try {
      await audioStreamer.initialize();
      Logger.info(TAG, "AudioStreamer initialized");
      // Wire up callbacks to break circular dependency
      audioStreamer.setSpeakingStateCallback((isSpeaking) => {
        this.handleSpeakingStateChange(isSpeaking);
      });
      audioStreamer.setBufferProgressCallback((progress) => {
        getConversationStore().getState().setBufferProgress(progress);
      });
      this.sendGreeting();
      store.setHasGreeted(true);

      // Mark intro as seen so returning users skip the auto-greeting
      const introStore =
        require("../../stores/conversationStore").useIntroStore;
      if (!introStore.getState().hasSeenIntro) {
        introStore.getState().setHasSeenIntro(true);
      }
    } catch (err) {
      Logger.error(TAG, "Failed to initialize audio streamer", err);
    }
  }

  /**
   * Initialize audio streamer without sending a greeting.
   * Used for returning users in default session — they speak first.
   */
  private async initializeAudioOnly(store: {
    hasGreeted: boolean;
    setHasGreeted: (v: boolean) => void;
  }): Promise<void> {
    try {
      await audioStreamer.initialize();
      Logger.info(TAG, "AudioStreamer initialized (no greeting)");
      audioStreamer.setSpeakingStateCallback((isSpeaking) => {
        this.handleSpeakingStateChange(isSpeaking);
      });
      audioStreamer.setBufferProgressCallback((progress) => {
        getConversationStore().getState().setBufferProgress(progress);
      });
      store.setHasGreeted(true);
    } catch (err) {
      Logger.error(TAG, "Failed to initialize audio streamer", err);
    }
  }

  private send(data: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      Logger.warn(
        TAG,
        `Attempted to send message but WebSocket state is ${this.ws?.readyState}`,
      );
    }
  }

  private handleMessage(response: GeminiServerResponse) {
    const store = getConversationStore().getState();

    // Support both camelCase and snake_case (API can return either)
    const isSetupCompleteReceived = !!(
      response.setup_complete || response.setupComplete
    );

    if (isSetupCompleteReceived) {
      Logger.info(TAG, "Setup complete - ready for conversation");
      this.isSetupComplete = true;
      this.reconnectAttempts = 0;
      this.setConnectionState("connected");
      if (this.pendingTraceIdAfterSetup) {
        this.turnTraceId = this.pendingTraceIdAfterSetup;
        this.pendingTraceIdAfterSetup = null;
      }

      // Always greet ONLY if we haven't greeted yet in this session.
      // We ignore this.lastInitialPrompt here because if we are reconnecting (hasGreeted=true),
      // we don't want to repeat the intro.
      if (!store.hasGreeted) {
        if (this.lastInitialPrompt) {
          // Scenario, practice phrase, or first-time intro — auto-greet
          Logger.info(
            TAG,
            `Triggering greeting (Has greeted: ${store.hasGreeted})`,
          );
          this.initializeAndGreet(store);
        } else {
          // Returning user, default session — just initialize audio, no auto-greet
          Logger.info(
            TAG,
            "No initial prompt — skipping auto-greet, initializing audio only",
          );
          this.initializeAudioOnly(store);
        }
      }

      if (this.pendingClientMessageAfterSetup) {
        const pendingMessage = this.pendingClientMessageAfterSetup;
        this.pendingClientMessageAfterSetup = null;
        Logger.info(
          TAG,
          `[DIAG] stage=startup_fast_retry_send trace=${this.turnTraceId}`,
        );
        this.send(JSON.stringify(pendingMessage));
      }
    }

    // Support both camelCase and snake_case
    const serverContent = response.server_content || response.serverContent;

    if (serverContent) {
      const modelTurn = serverContent.model_turn || serverContent.modelTurn;
      const inputTranscription =
        serverContent.input_transcription || serverContent.inputTranscription;
      const outputTranscription =
        serverContent.output_transcription || serverContent.outputTranscription;
      const isTurnComplete =
        serverContent.turn_complete || serverContent.turnComplete;
      const interrupted = serverContent.interrupted;

      // Handle audio from model
      if (modelTurn?.parts) {
        // Model started responding - clear processing state only when user is not actively holding PTT.
        if (!store.isPTTActive) {
          store.setProcessing(false);
        }

        for (const part of modelTurn.parts) {
          // Skip thinking parts — Gemini may mark internal reasoning with thought: true
          if (part.thought) continue;

          const suppressModelOutput =
            this.discardModelOutputWhilePTT || store.isPTTActive;

          const inlineData = part.inline_data || part.inlineData;
          if (inlineData) {
            const mimeType = inlineData.mime_type || inlineData.mimeType;
            if (mimeType?.startsWith("audio/pcm")) {
              if (suppressModelOutput) {
                if (!this.discardModelOutputWhilePTT) {
                  Logger.warn(
                    TAG,
                    `[DIAG] stage=model_output_discard_start trace=${this.turnTraceId} reason=ptt_active`,
                  );
                }
                this.discardModelOutputWhilePTT = true;
                this.suppressedModelAudioChunks++;
                continue;
              }

              // Prepare streamer for new response on first audio chunk
              if (this.isFirstAudioChunk) {
                this.audioChunksReceived = 0;
                this.resetTurnStreamMetrics();
                const firstChunkAt = Date.now();
                this.firstModelAudioChunkAtMs = firstChunkAt;
                this.lastModelAudioChunkAtMs = firstChunkAt;
                const ttfbMs =
                  this.activityEndAtMs !== null
                    ? firstChunkAt - this.activityEndAtMs
                    : -1;
                Logger.info(
                  TAG,
                  `First audio chunk — preparing response (dataLen=${inlineData.data.length})`,
                );
                if (ttfbMs >= 0) {
                  Logger.info(
                    TAG,
                    `[DIAG] Model first-audio latency=${ttfbMs}ms`,
                  );
                }
                Logger.info(
                  TAG,
                  `[DIAG] stage=first_audio_chunk trace=${this.turnTraceId} wsState=${this.ws?.readyState ?? -1}`,
                );
                audioStreamer.prepareForNewResponse(
                  this.turnTraceId,
                  this.startupSlaAnchorMs ?? undefined,
                );
                this.isFirstAudioChunk = false;
              } else {
                const now = Date.now();
                if (this.lastModelAudioChunkAtMs !== null) {
                  const gapMs = now - this.lastModelAudioChunkAtMs;
                  this.modelAudioGapTotalMs += gapMs;
                  this.modelAudioGapCount++;
                  if (gapMs > this.modelAudioGapMaxMs) {
                    this.modelAudioGapMaxMs = gapMs;
                  }
                }
                this.lastModelAudioChunkAtMs = now;
              }
              this.hasAudioInCurrentTurn = true;
              this.audioChunksReceived++;
              this.modelAudioBytesReceived +=
                GeminiWebSocket.estimateBase64DecodedBytes(inlineData.data);
              if (this.audioChunksReceived % 50 === 0) {
                const avgGapMs =
                  this.modelAudioGapCount > 0
                    ? this.modelAudioGapTotalMs / this.modelAudioGapCount
                    : 0;
                if (AUDIO_DIAG_VERBOSE) {
                  Logger.debug(
                    TAG,
                    `[DIAG] trace=${this.turnTraceId} recv chunk=${this.audioChunksReceived} avgGap=${avgGapMs.toFixed(1)}ms maxGap=${this.modelAudioGapMaxMs}ms`,
                  );
                }
              }
              audioStreamer.queueAudio(inlineData.data);
            }
          }
          // Only add text if transcription is not enabled or not received
          // Skip in audio-only mode (Vocab TTS)l
          if (
            part.text &&
            !outputTranscription &&
            !this.isAudioOnlyMode &&
            !this.discardModelOutputWhilePTT
          ) {
            this.queueModelTranscript(part.text);
          }
        }
      }

      // Handle user's speech transcription
      if (inputTranscription?.text) {
        const text = inputTranscription.text.trim();
        if (text) {
          Logger.info(TAG, `User transcribed: ${text}`);
          this.turnInputTranscript = this.turnInputTranscript
            ? `${this.turnInputTranscript} ${text}`.trim()
            : text;
          store.addMessage("user", text);
        }
      }

      // Handle model's speech transcription (skip in audio-only mode)
      if (
        outputTranscription?.text &&
        !this.isAudioOnlyMode &&
        !this.discardModelOutputWhilePTT
      ) {
        this.queueModelTranscript(outputTranscription.text);
      }

      if (isTurnComplete) {
        Logger.debug(TAG, "Turn complete");
      }

      // Handle generation complete - trigger audio playback
      const isGenerationComplete =
        serverContent.generation_complete || serverContent.generationComplete;
      if (isGenerationComplete) {
        if (this.discardModelOutputWhilePTT) {
          Logger.warn(
            TAG,
            `[DIAG] stage=model_output_discard_complete trace=${this.turnTraceId} reason=ptt_overlap suppressedAudioChunks=${this.suppressedModelAudioChunks}`,
          );
          this.pendingModelTranscript = "";
          this.hasAudioInCurrentTurn = false;
          this.awaitingSpeechEndToFlushText = false;
          this.pendingHealthRotationIssue = null;
          this.discardModelOutputWhilePTT = false;
          this.suppressedModelAudioChunks = 0;
          this.isFirstAudioChunk = true;
          this.resetTurnStreamMetrics();
          this.audioChunksReceived = 0;
          return;
        }

        const generationDoneAt = Date.now();
        const wallFromFirstMs =
          this.firstModelAudioChunkAtMs !== null
            ? generationDoneAt - this.firstModelAudioChunkAtMs
            : -1;
        const avgGapMs =
          this.modelAudioGapCount > 0
            ? this.modelAudioGapTotalMs / this.modelAudioGapCount
            : 0;
        Logger.info(
          TAG,
          `Generation complete - trace=${this.turnTraceId} ${this.audioChunksReceived} audio chunks received, wall=${wallFromFirstMs}ms, avgGap=${avgGapMs.toFixed(1)}ms, maxGap=${this.modelAudioGapMaxMs}ms`,
        );
        const wallSeconds = wallFromFirstMs > 0 ? wallFromFirstMs / 1000 : 0;
        const receivedAudioSeconds =
          this.modelAudioBytesReceived /
          PCM_BYTES_PER_SAMPLE /
          MODEL_AUDIO_SAMPLE_RATE;
        const modelRealtimeRatio =
          wallSeconds > 0 ? receivedAudioSeconds / wallSeconds : 0;
        const wsBufferedAvgBytes =
          this.wsBufferedAmountSamples > 0
            ? this.wsBufferedAmountTotal / this.wsBufferedAmountSamples
            : 0;
        const turnIssue = this.classifyTurnIssue(
          avgGapMs,
          modelRealtimeRatio,
          wsBufferedAvgBytes,
          this.wsBufferedAmountMax,
        );
        Logger.info(
          TAG,
          `[DIAG] stage=generation_complete trace=${this.turnTraceId} wsState=${this.ws?.readyState ?? -1} modelRatio=${modelRealtimeRatio.toFixed(2)} audioSec=${receivedAudioSeconds.toFixed(2)} bytes=${this.modelAudioBytesReceived} wsBufferedAvg=${wsBufferedAvgBytes.toFixed(0)} wsBufferedMax=${this.wsBufferedAmountMax} issue=${turnIssue.issue} reason=${turnIssue.reason}`,
        );
        const usageMetadata = response.usageMetadata || response.usage_metadata;
        if (usageMetadata) {
          Logger.info(
            TAG,
            `[DIAG] stage=usage_metadata trace=${this.turnTraceId} promptTokens=${usageMetadata.promptTokenCount ?? usageMetadata.prompt_token_count ?? -1} outputTokens=${usageMetadata.candidatesTokenCount ?? usageMetadata.candidates_token_count ?? -1} totalTokens=${usageMetadata.totalTokenCount ?? usageMetadata.total_token_count ?? -1}`,
          );
        }
        if (!this.hasAudioInCurrentTurn && this.audioChunksReceived === 0) {
          Logger.warn(
            TAG,
            "Generation complete received with no audio chunks; skipping playback completion",
          );
          this.clearStartupTimers();
          this.flushPendingModelTranscript();
          this.isFirstAudioChunk = true; // Reset for next response
          return;
        }
        this.clearStartupTimers();
        audioStreamer.onGenerationComplete();
        this.isFirstAudioChunk = true; // Reset for next response

        if (!this.hasAudioInCurrentTurn) {
          this.flushPendingModelTranscript();
          this.maybeRotateSessionForHealth(turnIssue);
        } else {
          this.awaitingSpeechEndToFlushText = true;
          this.pendingHealthRotationIssue = turnIssue;
          Logger.info(
            TAG,
            `[DIAG] stage=session_rotate_deferred trace=${this.turnTraceId} reason=await_speech_end`,
          );
        }
      }

      // Handle interruption (user spoke while model was speaking)
      if (interrupted) {
        const interruptionAt = Date.now();
        const sinceActivityStartMs =
          this.activityStartAtMs !== null
            ? interruptionAt - this.activityStartAtMs
            : -1;
        Logger.info(
          TAG,
          `Model interrupted by user (trace=${this.turnTraceId}, sinceActivityStart=${sinceActivityStartMs}ms)`,
        );
        audioStreamer.handleInterruption();
        store.handleInterruption();
        this.clearStartupTimers();
        this.hasPlaybackStartedInTurn = false;
        this.flushPendingModelTranscript();
        this.isFirstAudioChunk = true; // Reset for next response
      }
    }
  }

  disconnect() {
    // Clear any pending reconnect
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.clearStartupTimers();
    this.startupSlaAnchorMs = null;
    this.hasPlaybackStartedInTurn = false;
    this.fastRetryTriggeredForTurn = false;

    if (this.ws) {
      Logger.info(TAG, "Disconnecting WebSocket...");
      try {
        this.ws.close(1000, "User disconnected");
      } catch (e) {
        Logger.error(TAG, "Error closing WebSocket", e);
      }
      this.ws = null;
      this.isSetupComplete = false;
      this.resetModelTurnBuffer();
      this.setConnectionState("idle");
    }
  }
}

export const geminiWebSocket = GeminiWebSocket.getInstance();
