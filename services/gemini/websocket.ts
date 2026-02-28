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
const MODEL = "models/gemini-2.5-flash-native-audio-preview-12-2025";
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const ENABLE_LIVE_MODEL_OUTPUT_TRANSCRIPTION = false;
const ENABLE_LIVE_MODEL_TEXT_UPDATES = false;

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
    let type: GeminiErrorType = "unknown";
    let retryable = false;

    if (code === 1000) {
      type = "connection";
      retryable = false;
    } else if (code === 1006 || code === 1011) {
      type = "connection";
      retryable = true;
    } else if (code === 401 || code === 403) {
      type = "auth";
      retryable = false;
    } else if (code === 429) {
      type = "rate_limit";
      retryable = true;
    } else if (code && code >= 500) {
      type = "server";
      retryable = true;
    }

    return {
      type,
      message: message || "Connection error",
      code,
      retryable,
    };
  }

  connect(apiKey: string, systemInstruction: string, initialPrompt?: string) {
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
    this.lastInitialPrompt = initialPrompt; // Store initial prompt

    this.setConnectionState("connecting");
    Logger.info(TAG, `Connecting to Gemini Live API with model ${MODEL}...`);

    try {
      const wsUrl = `${this.url}?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        Logger.info(TAG, "WebSocket Connected successfully");
        this.reconnectAttempts = 0;
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
          const geminiError = this.categorizeError(
            event.code,
            event.reason || "Connection closed",
          );

          if (event.code === 1000) {
            Logger.info(TAG, "WebSocket Closed Gracefully (1000)");
            this.setConnectionState("idle");
          } else {
            Logger.warn(
              TAG,
              `WebSocket Closed. Code: ${event.code}, Reason: ${event.reason || "No reason provided"}`,
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
        this.connect(
          this.lastApiKey,
          this.lastInstruction,
          this.lastInitialPrompt,
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
    const setupPayload: Record<string, unknown> = {
      model: MODEL,
      generationConfig: {
        responseModalities: ["AUDIO"],
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
      // PTT Mode: Disable automatic VAD, use manual activity control
      // Client sends activityStart/activityEnd to control turn-taking
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: true,
        },
      },
    };
    if (ENABLE_LIVE_MODEL_OUTPUT_TRANSCRIPTION) {
      setupPayload.outputAudioTranscription = {};
    } else {
      Logger.info(
        TAG,
        "Live model output transcription disabled (audio-first mode)",
      );
    }
    const setupMsg = {
      setup: setupPayload,
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
    Logger.info(TAG, "Sending activityStart signal");
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
    Logger.info(TAG, "Sending activityEnd signal");
    this.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
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

    // Log first few chunks and then every 50th to verify audio is flowing
    this.audioChunksSent++;
    if (this.audioChunksSent <= 5 || this.audioChunksSent % 50 === 0) {
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
    audioStreamer.prepareForNewResponse({ startPolicy: "streaming" });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async initializeAndGreet(store: {
    hasGreeted: boolean;
    setHasGreeted: (v: boolean) => void;
  }): Promise<void> {
    try {
      await audioStreamer.initialize();
      Logger.info(TAG, "AudioStreamer initialized");
      // Wire up callbacks to break circular dependency
      audioStreamer.setSpeakingStateCallback((isSpeaking) => {
        getConversationStore().getState().setSpeaking(isSpeaking);
      });
      audioStreamer.setBufferProgressCallback((progress) => {
        getConversationStore().getState().setBufferProgress(progress);
      });
      this.sendGreeting();
      store.setHasGreeted(true);

      // Mark intro as seen so returning users skip the auto-greeting
      const introStore = require("../../stores/conversationStore").useIntroStore;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async initializeAudioOnly(store: {
    hasGreeted: boolean;
    setHasGreeted: (v: boolean) => void;
  }): Promise<void> {
    try {
      await audioStreamer.initialize();
      Logger.info(TAG, "AudioStreamer initialized (no greeting)");
      audioStreamer.setSpeakingStateCallback((isSpeaking) => {
        getConversationStore().getState().setSpeaking(isSpeaking);
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
      this.setConnectionState("connected");

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
          Logger.info(TAG, "No initial prompt — skipping auto-greet, initializing audio only");
          this.initializeAudioOnly(store);
        }
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
        // Model started responding - clear processing state
        store.setProcessing(false);

        for (const part of modelTurn.parts) {
          // Skip thinking parts — Gemini may mark internal reasoning with thought: true
          if (part.thought) continue;

          const inlineData = part.inline_data || part.inlineData;
          if (inlineData) {
            const mimeType = inlineData.mime_type || inlineData.mimeType;
            if (mimeType?.startsWith("audio/pcm")) {
              // Prepare streamer for new response on first audio chunk
              if (this.isFirstAudioChunk) {
                this.audioChunksReceived = 0;
                Logger.info(TAG, `First audio chunk — preparing response (dataLen=${inlineData.data.length})`);
                audioStreamer.prepareForNewResponse({
                  startPolicy: this.isAudioOnlyMode
                    ? "streaming"
                    : undefined,
                });
                this.isFirstAudioChunk = false;
              }
              this.audioChunksReceived++;
              audioStreamer.queueAudio(inlineData.data);
            }
          }
          // Only add text if transcription is not enabled or not received
          // Skip in audio-only mode (Vocab TTS)l
          if (
            ENABLE_LIVE_MODEL_TEXT_UPDATES &&
            part.text &&
            !outputTranscription &&
            !this.isAudioOnlyMode
          ) {
            const filteredText = filterTranscriptText(part.text);
            if (filteredText) {
              Logger.info(
                TAG,
                `Received text from model: ${filteredText.substring(0, 50)}...`,
              );
              store.addMessage("model", filteredText);
            }
          }
        }
      }

      // Handle user's speech transcription
      if (inputTranscription?.text) {
        const text = inputTranscription.text.trim();
        if (text) {
          Logger.info(TAG, `User transcribed: ${text}`);
          store.addMessage("user", text);
        }
      }

      // Handle model's speech transcription (skip in audio-only mode)
      if (
        ENABLE_LIVE_MODEL_TEXT_UPDATES &&
        outputTranscription?.text &&
        !this.isAudioOnlyMode
      ) {
        const text = filterTranscriptText(outputTranscription.text.trim());
        if (text) {
          Logger.info(TAG, `Model transcribed: ${text}`);
          store.addMessage("model", text);
        }
      }

      if (isTurnComplete) {
        Logger.debug(TAG, "Turn complete");
      }

      // Handle generation complete - trigger audio playback
      const isGenerationComplete =
        serverContent.generation_complete || serverContent.generationComplete;
      if (isGenerationComplete) {
        Logger.info(TAG, `Generation complete — ${this.audioChunksReceived} audio chunks received`);
        audioStreamer.onGenerationComplete();
        this.isFirstAudioChunk = true; // Reset for next response
        this.isAudioOnlyMode = false; // Reset audio-only mode
      }

      // Handle interruption (user spoke while model was speaking)
      if (interrupted) {
        Logger.info(TAG, "Model interrupted by user");
        audioStreamer.handleInterruption();
        store.handleInterruption();
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

    if (this.ws) {
      Logger.info(TAG, "Disconnecting WebSocket...");
      try {
        this.ws.close(1000, "User disconnected");
      } catch (e) {
        Logger.error(TAG, "Error closing WebSocket", e);
      }
      this.ws = null;
      this.isSetupComplete = false;
      this.setConnectionState("idle");
    }
  }
}

export const geminiWebSocket = GeminiWebSocket.getInstance();
