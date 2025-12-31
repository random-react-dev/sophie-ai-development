import { useConversationStore } from '../../stores/conversationStore';
import { audioPlayer } from '../audio/player';
import { Logger } from '../common/Logger';
import {
    ConnectionState,
    GeminiClientContent,
    GeminiError,
    GeminiErrorType,
    GeminiRealtimeInput,
    GeminiServerResponse,
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
                this.isSetupComplete = false;
                this.sendSetupMessage(systemInstruction);
            };

            ws.onmessage = async (event: MessageEvent) => {
                if (this.ws !== ws) return;
                try {
                    let data = event.data;
                    if (data instanceof Blob) {
                        data = await data.text();
                    }
                    if (typeof data === 'string') {
                        Logger.debug(TAG, `Raw Message: ${data.substring(0, 500)}`);
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

        const setupMsg = {
            setup: {
                model: MODEL,
                generation_config: {
                    response_modalities: ["AUDIO"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: "Aoede"
                            }
                        }
                    }
                },
                system_instruction: {
                    parts: [{ text: instruction || defaultInstruction }]
                },
                input_audio_transcription: {},
                output_audio_transcription: {}
            }
        };
        this.send(JSON.stringify(setupMsg));
    }

    sendAudioChunk(base64Data: string) {
        if (this.connectionState !== 'connected' || !this.ws) {
            Logger.warn(TAG, 'Cannot send audio: WebSocket not connected');
            return;
        }

        if (!this.isSetupComplete) {
            Logger.warn(TAG, 'Cannot send audio: Setup not complete yet');
            return;
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

    private send(data: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            Logger.warn(TAG, `Attempted to send message but WebSocket state is ${this.ws?.readyState}`);
        }
    }

    private handleMessage(response: GeminiServerResponse) {
        const store = useConversationStore.getState();

        if (response.setup_complete) {
            Logger.info(TAG, 'Handshake complete: setup_complete received');
            this.isSetupComplete = true;
            this.setConnectionState('connected');

            // Trigger AI response to greet the user
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
            Logger.info(TAG, 'Sending initial greeting trigger...');
            this.send(JSON.stringify(greetingMsg));
        }

        const serverContent = response.server_content;

        if (serverContent) {
            const { model_turn, input_transcription, output_transcription, turn_complete, interrupted } = serverContent;

            // Handle audio from model
            if (model_turn?.parts) {
                for (const part of model_turn.parts) {
                    if (part.inline_data) {
                        const mimeType = part.inline_data.mime_type;
                        if (mimeType?.startsWith('audio/pcm')) {
                            Logger.debug(TAG, 'Received audio chunk from model');
                            audioPlayer.queueAudio(part.inline_data.data);
                        }
                    }
                    // Only add text if transcription is not enabled or not received
                    if (part.text && !output_transcription) {
                        Logger.info(TAG, `Received text from model: ${part.text.substring(0, 50)}...`);
                        store.addMessage('model', part.text);
                    }
                }
            }

            // Handle user's speech transcription
            if (input_transcription?.text) {
                const text = input_transcription.text.trim();
                if (text) {
                    Logger.info(TAG, `User transcribed: ${text}`);
                    store.addMessage('user', text);
                }
            }

            // Handle model's speech transcription
            if (output_transcription?.text) {
                const text = output_transcription.text.trim();
                if (text) {
                    Logger.info(TAG, `Model transcribed: ${text}`);
                    store.addMessage('model', text);
                }
            }

            if (turn_complete) {
                Logger.debug(TAG, 'Turn complete');
            }

            // Handle interruption (user spoke while model was speaking)
            if (interrupted) {
                Logger.info(TAG, 'Model interrupted by user');
                audioPlayer.clearQueue();
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
