import { useConversationStore } from '../../stores/conversationStore';
import { audioStreamer } from '../audio/streamer';
import { Logger } from '../common/Logger';
import {
    ConnectionState,
    GeminiClientContent,
    GeminiError,
    GeminiErrorType,
    GeminiRealtimeInput,
    GeminiServerResponse
} from './types';

const TAG = 'GeminiWS';
const MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025';
const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_DELAY_MS = 1000;

class GeminiWebSocket {
    private ws: WebSocket | null = null;
    private url = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
    private connectionState: ConnectionState = 'idle';
    private isSetupComplete = false;
    private reconnectAttempts = 0;
    private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private lastApiKey: string = '';
    private lastInstruction: string = '';
    private audioChunksSent = 0;

    // Singleton
    private static instance: GeminiWebSocket;
    private constructor() { }
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
        return this.connectionState === 'connected' && this.isSetupComplete;
    }

    private setConnectionState(state: ConnectionState, error?: GeminiError) {
        this.connectionState = state;
        const store = useConversationStore.getState();
        store.setConnectionState(state);
        if (error) {
            store.setError(error.message);
        } else if (state === 'connected') {
            store.setError(null);
        }
    }

    private categorizeError(code?: number, message?: string): GeminiError {
        let type: GeminiErrorType = 'unknown';
        let retryable = false;

        if (code === 1000) {
            type = 'connection';
            retryable = false;
        } else if (code === 1006 || code === 1011) {
            type = 'connection';
            retryable = true;
        } else if (code === 401 || code === 403) {
            type = 'auth';
            retryable = false;
        } else if (code === 429) {
            type = 'rate_limit';
            retryable = true;
        } else if (code && code >= 500) {
            type = 'server';
            retryable = true;
        }

        return {
            type,
            message: message || 'Connection error',
            code,
            retryable,
        };
    }

    connect(apiKey: string, systemInstruction: string) {
        // Clear any pending reconnect
        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        // Already connected or connecting
        if (this.ws && (this.connectionState === 'connected' || this.connectionState === 'connecting')) {
            Logger.warn(TAG, 'WebSocket already connected or connecting');
            return;
        }

        // Store for reconnection
        this.lastApiKey = apiKey;
        this.lastInstruction = systemInstruction;

        this.setConnectionState('connecting');
        Logger.info(TAG, `Connecting to Gemini Live API with model ${MODEL}...`);

        try {
            const wsUrl = `${this.url}?key=${apiKey}`;
            const ws = new WebSocket(wsUrl);
            this.ws = ws;

            ws.onopen = () => {
                if (this.ws !== ws) return;
                Logger.info(TAG, 'WebSocket Connected successfully');
                this.reconnectAttempts = 0;
                this.audioChunksSent = 0;
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
                        const decoder = new TextDecoder('utf-8');
                        data = decoder.decode(data);
                    } else if (typeof data === 'object' && data !== null) {
                        data = JSON.stringify(data);
                    }

                    if (typeof data === 'string') {
                        const response = JSON.parse(data) as GeminiServerResponse;
                        this.handleMessage(response);
                    }
                } catch (error) {
                    Logger.error(TAG, 'Error parsing WebSocket message', error);
                }
            };

            ws.onclose = (event: CloseEvent) => {
                if (this.ws === ws) {
                    const geminiError = this.categorizeError(event.code, event.reason || 'Connection closed');

                    if (event.code === 1000) {
                        Logger.info(TAG, 'WebSocket Closed Gracefully (1000)');
                        this.setConnectionState('idle');
                    } else {
                        Logger.warn(TAG, `WebSocket Closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);

                        // Attempt reconnection if retryable
                        if (geminiError.retryable && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                            this.scheduleReconnect();
                        } else {
                            this.setConnectionState('error', geminiError);
                        }
                    }

                    this.isSetupComplete = false;
                    this.ws = null;
                } else {
                    Logger.debug(TAG, 'Ignored onclose for old WebSocket instance');
                }
            };

            ws.onerror = (error: Event) => {
                if (this.ws !== ws) return;
                Logger.error(TAG, 'WebSocket Error', error);
            };
        } catch (error) {
            Logger.error(TAG, 'Failed to initialize WebSocket', error);
            this.setConnectionState('error', {
                type: 'connection',
                message: 'Failed to initialize connection',
                retryable: false,
            });
        }
    }

    private scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(
            INITIAL_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
            10000
        );

        Logger.info(TAG, `Scheduling reconnect attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
        this.setConnectionState('reconnecting');

        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectTimeoutId = null;
            if (this.lastApiKey && this.lastInstruction) {
                this.connect(this.lastApiKey, this.lastInstruction);
            }
        }, delay);
    }

    private sendSetupMessage(instruction: string) {
        Logger.info(TAG, 'Sending setup message...');
        const defaultInstruction = "You are Sophie, a friendly AI language tutor. You help users master real-world conversation. When a user makes a mistake, provide a 'Natural Correction'—a more native way to say it—and explain the nuance briefly. Keep your spoken responses short and encouraging. Always respond in the target language unless an English explanation is needed for clarity.";

        // IMPORTANT: Gemini API expects camelCase in setup message (not snake_case)
        const setupMsg = {
            setup: {
                model: MODEL,
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Aoede'
                            }
                        }
                    }
                },
                systemInstruction: {
                    parts: [{ text: instruction || defaultInstruction }]
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                // Configure VAD for reliable turn detection after model speaks
                realtimeInputConfig: {
                    automaticActivityDetection: {
                        endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
                        silenceDurationMs: 300
                    }
                }
            }
        };
        Logger.debug(TAG, `Setup message: ${JSON.stringify(setupMsg)}`);
        this.send(JSON.stringify(setupMsg));
    }

    sendAudioChunk(base64Data: string) {
        // Validate input data
        if (!base64Data || base64Data.length === 0) {
            Logger.warn(TAG, 'sendAudioChunk called with empty data');
            return;
        }

        if (this.connectionState !== 'connected' || !this.ws) {
            Logger.warn(TAG, `Cannot send audio: state=${this.connectionState}`);
            return;
        }

        if (!this.isSetupComplete) {
            Logger.warn(TAG, 'Cannot send audio: Setup not complete yet');
            return;
        }

        // Audio is always sent - hardware AEC handles echo cancellation
        // Gemini's automatic VAD handles turn detection and interruptions

        // Log first few chunks and then every 50th to verify audio is flowing
        this.audioChunksSent++;
        if (this.audioChunksSent <= 5 || this.audioChunksSent % 50 === 0) {
            Logger.debug(TAG, `Sending audio chunk #${this.audioChunksSent} (${base64Data.length} chars)`);
        }

        const msg: GeminiRealtimeInput = {
            realtimeInput: {
                audio: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Data
                }
            }
        };
        this.send(JSON.stringify(msg));
    }

    /**
     * Send a greeting request to Sophie. Called from HomeScreen on first mic press.
     */
    sendGreeting() {
        if (!this.isSetupComplete) {
            Logger.warn(TAG, 'Cannot send greeting: Setup not complete');
            return;
        }

        Logger.info(TAG, 'Requesting Sophie greeting...');
        const greetingMsg: GeminiClientContent = {
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{
                        text: "Say hi and ask me one simple question to start practicing. Keep it under 2 sentences."
                    }]
                }],
                turnComplete: true
            }
        };
        this.send(JSON.stringify(greetingMsg));
    }

    private send(data: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            Logger.warn(TAG, `Attempted to send message but WebSocket state is ${this.ws?.readyState}`);
        }
    }

    private handleMessage(response: GeminiServerResponse) {
        const store = useConversationStore.getState();

        // Support both camelCase and snake_case (API can return either)
        const isSetupCompleteReceived = !!(response.setup_complete || response.setupComplete);

        if (isSetupCompleteReceived) {
            Logger.info(TAG, 'Setup complete - ready for conversation');
            this.isSetupComplete = true;
            this.setConnectionState('connected');

            // Auto-greet on first connection
            if (!store.hasGreeted) {
                Logger.info(TAG, 'Auto-sending greeting...');
                this.sendGreeting();
                store.setHasGreeted(true);
            }
        }

        // Support both camelCase and snake_case
        const serverContent = response.server_content || response.serverContent;

        if (serverContent) {
            const modelTurn = serverContent.model_turn || serverContent.modelTurn;
            const inputTranscription = serverContent.input_transcription || serverContent.inputTranscription;
            const outputTranscription = serverContent.output_transcription || serverContent.outputTranscription;
            const isTurnComplete = serverContent.turn_complete || serverContent.turnComplete;
            const interrupted = serverContent.interrupted;

            // Handle audio from model
            if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                    const inlineData = part.inline_data || part.inlineData;
                    if (inlineData) {
                        const mimeType = inlineData.mime_type || inlineData.mimeType;
                        if (mimeType?.startsWith('audio/pcm')) {
                            Logger.debug(TAG, 'Received audio chunk from model');
                            audioStreamer.queueAudio(inlineData.data);
                        }
                    }
                    // Only add text if transcription is not enabled or not received
                    if (part.text && !outputTranscription) {
                        Logger.info(TAG, `Received text from model: ${part.text.substring(0, 50)}...`);
                        store.addMessage('model', part.text);
                    }
                }
            }

            // Handle user's speech transcription
            if (inputTranscription?.text) {
                const text = inputTranscription.text.trim();
                if (text) {
                    Logger.info(TAG, `User transcribed: ${text}`);
                    store.addMessage('user', text);
                }
            }

            // Handle model's speech transcription
            if (outputTranscription?.text) {
                const text = outputTranscription.text.trim();
                if (text) {
                    Logger.info(TAG, `Model transcribed: ${text}`);
                    store.addMessage('model', text);
                }
            }

            if (isTurnComplete) {
                Logger.debug(TAG, 'Turn complete');
            }

            // Handle generation complete - trigger audio playback
            const isGenerationComplete = serverContent.generation_complete || serverContent.generationComplete;
            if (isGenerationComplete) {
                Logger.debug(TAG, 'Generation complete');
                audioStreamer.onGenerationComplete();
            }

            // Handle interruption (user spoke while model was speaking)
            if (interrupted) {
                Logger.info(TAG, 'Model interrupted by user');
                audioStreamer.handleInterruption();
                store.handleInterruption();
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
            Logger.info(TAG, 'Disconnecting WebSocket...');
            try {
                this.ws.close(1000, 'User disconnected');
            } catch (e) {
                Logger.error(TAG, 'Error closing WebSocket', e);
            }
            this.ws = null;
            this.isSetupComplete = false;
            this.setConnectionState('idle');
        }
    }
}

export const geminiWebSocket = GeminiWebSocket.getInstance();
