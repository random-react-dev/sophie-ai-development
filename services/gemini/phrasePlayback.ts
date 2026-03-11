import { createAudioStreamer } from "../audio/streamer";
import { Logger } from "../common/Logger";
import {
  GEMINI_LIVE_MAX_OUTPUT_TOKENS,
  GEMINI_LIVE_MODEL_FALLBACK,
  GEMINI_LIVE_MODEL_PRIMARY,
  GEMINI_LIVE_VOICE_NAME,
} from "./liveConfig";
import { getGeminiSessionToken } from "./token";
import { GeminiClientContent, GeminiServerResponse } from "./types";

const TAG = "PhrasePlayback";
const WS_CONNECTING = 0;
const WS_OPEN = 1;
const UNSUPPORTED_MODEL_CLOSE_CODE = 1008;
const START_TIMEOUT_MS =
  Number(process.env.EXPO_PUBLIC_STARTUP_SLA_MS ?? "10000") + 2000;

export interface PhrasePlaybackCallbacks {
  onStart?: () => void;
  onDone?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
}

export type PhrasePlaybackResult = "started" | "cancelled" | "failed";

class GeminiPhrasePlaybackService {
  private readonly streamer = createAudioStreamer();
  private ws: WebSocket | null = null;
  private url =
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
  private requestId = 0;
  private activeTraceId: string | null = null;
  private pendingStartResolver:
    | ((result: PhrasePlaybackResult) => void)
    | null = null;
  private startTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeSpeaking: (() => void) | null = null;
  private callbacks: PhrasePlaybackCallbacks = {};
  private playbackStarted = false;
  private generationComplete = false;
  private hasAudio = false;
  private stopRequested = false;
  private activeModel = GEMINI_LIVE_MODEL_PRIMARY;
  private hasRetriedWithFallback = false;

  async playPhrase(
    phrase: string,
    language: string,
    callbacks: PhrasePlaybackCallbacks = {},
  ): Promise<PhrasePlaybackResult> {
    const normalizedPhrase = phrase.trim();
    if (!normalizedPhrase) {
      return "failed";
    }

    const normalizedLanguage = language.trim() || "the target language";

    await this.stop();

    let token: string;
    try {
      token = await getGeminiSessionToken();
    } catch (error) {
      callbacks.onError?.(
        this.toError(error, "Failed to get Gemini playback token"),
      );
      return "failed";
    }

    await this.streamer.initialize();

    const requestId = ++this.requestId;
    const traceId = this.buildTraceId(requestId);

    this.callbacks = callbacks;
    this.activeTraceId = traceId;
    this.playbackStarted = false;
    this.generationComplete = false;
    this.hasAudio = false;
    this.stopRequested = false;
    this.activeModel = GEMINI_LIVE_MODEL_PRIMARY;
    this.hasRetriedWithFallback = false;

    this.unsubscribeSpeaking = this.streamer.addSpeakingStateListener(
      (isSpeaking, eventTraceId) => {
        if (requestId !== this.requestId || eventTraceId !== traceId) {
          return;
        }

        if (isSpeaking) {
          if (!this.playbackStarted) {
            this.playbackStarted = true;
            this.resolveStart("started");
            this.callbacks.onStart?.();
          }
          return;
        }

        if (this.playbackStarted && this.generationComplete) {
          this.finishPlayback(requestId, "done");
        }
      },
    );

    return await new Promise<PhrasePlaybackResult>((resolve) => {
      this.pendingStartResolver = resolve;
      this.startTimeoutId = setTimeout(() => {
        if (
          requestId !== this.requestId ||
          this.playbackStarted ||
          this.stopRequested
        ) {
          return;
        }

        const error = new Error("Timed out waiting for phrase playback");
        Logger.warn(TAG, error.message);
        this.failPlayback(requestId, error);
      }, START_TIMEOUT_MS);

      this.openSocket(
        requestId,
        token,
        normalizedPhrase,
        normalizedLanguage,
        traceId,
      );
    });
  }

  async stop(): Promise<void> {
    if (!this.activeTraceId && !this.ws) {
      return;
    }

    this.stopRequested = true;
    const activeRequestId = this.requestId;
    this.finishPlayback(activeRequestId, "cancelled");
    this.streamer.clearQueue();
  }

  private openSocket(
    requestId: number,
    token: string,
    phrase: string,
    language: string,
    traceId: string,
  ): void {
    const ws = new WebSocket(`${this.url}?key=${token}`);
    this.ws = ws;

    ws.onopen = () => {
      if (!this.isActiveRequest(requestId, ws)) return;

      Logger.info(
        TAG,
        `Connected trace=${traceId} model=${this.activeModel}`,
      );
      this.sendSetupMessage(ws, language);
    };

    ws.onmessage = async (event: MessageEvent) => {
      if (!this.isActiveRequest(requestId, ws)) return;

      const response = await this.parseResponse(event.data);
      if (!response) return;

      this.handleMessage(requestId, ws, response, phrase, language, traceId);
    };

    ws.onclose = (event: CloseEvent) => {
      if (!this.isActiveRequest(requestId, ws)) return;

      if (this.stopRequested) {
        this.finishPlayback(requestId, "cancelled");
        return;
      }

      if (this.shouldRetryWithFallback(event.code, event.reason)) {
        Logger.warn(
          TAG,
          `Retrying phrase playback with fallback model after unsupported close: ${event.reason || "no reason"}`,
        );
        this.hasRetriedWithFallback = true;
        this.activeModel = GEMINI_LIVE_MODEL_FALLBACK;
        this.cleanupSocket("Retrying fallback model");
        this.streamer.clearQueue();
        this.playbackStarted = false;
        this.generationComplete = false;
        this.hasAudio = false;
        this.openSocket(requestId, token, phrase, language, traceId);
        return;
      }

      if (event.code === 1000 && this.playbackStarted && this.generationComplete) {
        return;
      }

      const message =
        event.reason ||
        `Phrase playback socket closed with code ${event.code ?? -1}`;
      this.failPlayback(requestId, new Error(message));
    };

    ws.onerror = (error: Event) => {
      if (!this.isActiveRequest(requestId, ws)) return;
      Logger.error(TAG, "Phrase playback socket error", error);
    };
  }

  private shouldRetryWithFallback(code?: number, reason?: string): boolean {
    if (this.hasRetriedWithFallback) return false;
    if (this.playbackStarted) return false;
    if (
      !GEMINI_LIVE_MODEL_FALLBACK ||
      GEMINI_LIVE_MODEL_FALLBACK === GEMINI_LIVE_MODEL_PRIMARY
    ) {
      return false;
    }
    if (code !== UNSUPPORTED_MODEL_CLOSE_CODE) return false;
    if (!reason) return false;

    return (
      reason.includes("is not found for API version") ||
      reason.includes("not supported for bidiGenerateContent")
    );
  }

  private isActiveRequest(requestId: number, ws: WebSocket): boolean {
    return this.requestId === requestId && this.ws === ws;
  }

  private buildTraceId(requestId: number): string {
    return `phrase-${requestId}-${Date.now()}`;
  }

  private clearStartTimeout(): void {
    if (this.startTimeoutId !== null) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
  }

  private resolveStart(result: PhrasePlaybackResult): void {
    if (!this.pendingStartResolver) {
      return;
    }

    this.pendingStartResolver(result);
    this.pendingStartResolver = null;
    this.clearStartTimeout();
  }

  private cleanupSocket(closeReason: string): void {
    const ws = this.ws;
    if (!ws) return;

    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;

    if (ws.readyState === WS_CONNECTING || ws.readyState === WS_OPEN) {
      try {
        ws.close(1000, closeReason);
      } catch {
        // Ignore close races during teardown.
      }
    }

    this.ws = null;
  }

  private finishPlayback(
    requestId: number,
    outcome: "done" | "cancelled",
  ): void {
    if (requestId !== this.requestId) {
      return;
    }

    const callbacks = this.callbacks;

    this.resolveStart("cancelled");
    this.unsubscribeSpeaking?.();
    this.unsubscribeSpeaking = null;
    this.cleanupSocket(
      outcome === "done" ? "Phrase playback complete" : "Phrase playback stopped",
    );

    this.callbacks = {};
    this.activeTraceId = null;
    this.playbackStarted = false;
    this.generationComplete = false;
    this.hasAudio = false;
    this.stopRequested = false;
    this.activeModel = GEMINI_LIVE_MODEL_PRIMARY;
    this.hasRetriedWithFallback = false;

    if (outcome === "done") {
      callbacks.onDone?.();
    } else {
      callbacks.onStop?.();
    }
  }

  private failPlayback(requestId: number, error: Error): void {
    if (requestId !== this.requestId) {
      return;
    }

    const callbacks = this.callbacks;

    this.resolveStart("failed");
    this.unsubscribeSpeaking?.();
    this.unsubscribeSpeaking = null;
    this.cleanupSocket("Phrase playback failed");

    this.callbacks = {};
    this.activeTraceId = null;
    this.playbackStarted = false;
    this.generationComplete = false;
    this.hasAudio = false;
    this.stopRequested = false;
    this.activeModel = GEMINI_LIVE_MODEL_PRIMARY;
    this.hasRetriedWithFallback = false;

    callbacks.onError?.(error);
  }

  private sendSetupMessage(ws: WebSocket, language: string): void {
    const setupMsg = {
      setup: {
        model: this.activeModel,
        generationConfig: {
          responseModalities: ["AUDIO"],
          maxOutputTokens: GEMINI_LIVE_MAX_OUTPUT_TOKENS,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: GEMINI_LIVE_VOICE_NAME,
              },
            },
          },
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
        systemInstruction: {
          parts: [
            {
              text: [
                "You are Sophie AI in pronunciation-only mode.",
                "This session is NOT a lesson and NOT a conversation.",
                "Never explain, teach, greet, translate, or add extra words.",
                `When asked to speak a phrase in ${language}, output audio for exactly that phrase and nothing else.`,
              ].join(" "),
            },
          ],
        },
      },
    };

    ws.send(JSON.stringify(setupMsg));
  }

  private sendPhraseRequest(
    ws: WebSocket,
    phrase: string,
    language: string,
    traceId: string,
  ): void {
    Logger.info(TAG, `Requesting isolated playback trace=${traceId}`);

    this.streamer.prepareForNewResponse(traceId, Date.now(), true);

    const request: GeminiClientContent = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `Pronounce exactly this phrase in ${language}. No intro. No explanation. No extra words. Speak only this text exactly as written:\n"${phrase}"`,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };

    ws.send(JSON.stringify(request));
  }

  private handleMessage(
    requestId: number,
    ws: WebSocket,
    response: GeminiServerResponse,
    phrase: string,
    language: string,
    traceId: string,
  ): void {
    if (!this.isActiveRequest(requestId, ws)) {
      return;
    }

    const isSetupComplete = !!(response.setup_complete || response.setupComplete);
    if (isSetupComplete) {
      this.sendPhraseRequest(ws, phrase, language, traceId);
      return;
    }

    const serverContent = response.server_content || response.serverContent;
    if (!serverContent) {
      return;
    }

    const modelTurn = serverContent.model_turn || serverContent.modelTurn;
    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        const inlineData = part.inline_data || part.inlineData;
        const mimeType = inlineData?.mime_type || inlineData?.mimeType;
        if (inlineData && mimeType?.startsWith("audio/pcm")) {
          this.hasAudio = true;
          this.streamer.queueAudio(inlineData.data);
        }
      }
    }

    const isGenerationComplete =
      serverContent.generation_complete || serverContent.generationComplete;
    if (!isGenerationComplete) {
      return;
    }

    this.generationComplete = true;

    if (!this.hasAudio) {
      this.failPlayback(
        requestId,
        new Error("Gemini returned no audio for phrase playback"),
      );
      return;
    }

    this.streamer.onGenerationComplete();
  }

  private async parseResponse(
    rawData: MessageEvent["data"],
  ): Promise<GeminiServerResponse | null> {
    try {
      let data = rawData;

      if (data instanceof Blob) {
        data = await data.text();
      } else if (data instanceof ArrayBuffer) {
        const decoder = new TextDecoder("utf-8");
        data = decoder.decode(data);
      } else if (typeof data === "object" && data !== null) {
        data = JSON.stringify(data);
      }

      if (typeof data !== "string") {
        return null;
      }

      return JSON.parse(data) as GeminiServerResponse;
    } catch (error) {
      Logger.error(TAG, "Failed to parse phrase playback response", error);
      return null;
    }
  }

  private toError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(fallbackMessage);
  }
}

export const geminiPhrasePlayback = new GeminiPhrasePlaybackService();
