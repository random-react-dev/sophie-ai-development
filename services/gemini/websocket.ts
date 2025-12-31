import ReconnectingWebSocket from 'reconnecting-websocket';
import { useConversationStore } from '../../stores/conversationStore';
import { audioPlayer } from '../audio/player';
import { GeminiRealtimeInput, GeminiServerResponse, GeminiSetupMessage } from './types';
import { Logger } from '../common/Logger';

const TAG = 'GeminiWS';

class GeminiWebSocket {
    private ws: ReconnectingWebSocket | null = null;
    private url = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
    private isConnected = false;
    private isSetupComplete = false;

    // Singleton
    private static instance: GeminiWebSocket;
    private constructor() { }
    public static getInstance(): GeminiWebSocket {
        if (!GeminiWebSocket.instance) {
            GeminiWebSocket.instance = new GeminiWebSocket();
        }
        return GeminiWebSocket.instance;
    }

    connect(apiKey: string, systemInstruction: string) {
        if (this.ws || this.isConnected) {
            Logger.warn(TAG, 'WebSocket already connected or connecting');
            return;
        }

        const wsUrl = `${this.url}?key=${apiKey}`;
        Logger.info(TAG, 'Connecting to Gemini Live API...');

        this.ws = new ReconnectingWebSocket(wsUrl, [], {
            maxRetries: 5,
            connectionTimeout: 5000,
            debug: false,
        });

        this.ws.onopen = () => {
            Logger.info(TAG, 'WebSocket Connected successfully');
            this.isConnected = true;
            this.isSetupComplete = false;
            this.sendSetupMessage(systemInstruction);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                let data = event.data;
                if (typeof data === 'string') {
                    const response = JSON.parse(data) as GeminiServerResponse;
                    Logger.debug(TAG, `Received message: ${Object.keys(response).join(', ')}`);
                    this.handleMessage(response);
                }
            } catch (error) {
                Logger.error(TAG, 'Error parsing WebSocket message', error);
            }
        };

        this.ws.onclose = (event) => {
            if (event.code !== 1000) {
                Logger.warn(TAG, `WebSocket Closed Abnormally. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
            } else {
                Logger.info(TAG, 'WebSocket Closed Gracefully');
            }
            this.isConnected = false;
            this.isSetupComplete = false;
            const store = useConversationStore.getState();
            store.setIsConnected(false);
        };

        this.ws.onerror = (error: any) => {
            Logger.error(TAG, 'WebSocket Error', error.message || error || 'Unknown WebSocket error');
        };
    }

    sendSetupMessage(instruction: string) {
        Logger.info(TAG, 'Sending setup message...');
        const defaultInstruction = "You are Sophie, a friendly AI language tutor. You help users master real-world conversation. When a user makes a mistake, provide a 'Natural Correction'—a more native way to say it—and explain the nuance briefly. Keep your spoken responses short and encouraging. Always respond in the target language unless an English explanation is needed for clarity.";
        const setupMsg: GeminiSetupMessage = {
            setup: {
                model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
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
                }
            }
        };
        this.send(JSON.stringify(setupMsg));
    }

    sendAudioChunk(base64Data: string) {
        if (!this.isConnected) {
            Logger.warn(TAG, 'Cannot send audio: WebSocket not connected');
            return;
        }

        if (!this.isSetupComplete) {
            Logger.warn(TAG, 'Cannot send audio: Setup not complete yet');
            return;
        }

        Logger.debug(TAG, `Sending audio chunk of size ${base64Data.length}`);
        const msg: GeminiRealtimeInput = {
            realtime_input: {
                media_chunks: [{
                    mime_type: "audio/pcm;rate=16000",
                    data: base64Data
                }]
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

        if (response.setupComplete) {
            Logger.info(TAG, 'Handshake complete: Sophie is ready to listen');
            this.isSetupComplete = true;
            store.setIsConnected(true);
        }

        if (response.serverContent?.modelTurn) {
            const parts = response.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                    Logger.debug(TAG, 'Received audio chunk from model');
                    audioPlayer.queueAudio(part.inlineData.data);
                }
                if (part.text) {
                    Logger.info(TAG, `Received text from model: ${part.text.substring(0, 50)}...`);
                    store.addMessage('model', part.text);
                }
            }
        }

        if (response.serverContent?.turnComplete) {
            Logger.info(TAG, 'Turn complete received');
        }

        if (response.serverContent?.interrupted) {
            Logger.info(TAG, 'Model interrupted by user');
            audioPlayer.clearQueue();
            store.handleInterruption();
        }
    }

    disconnect() {
        if (this.ws) {
            Logger.info(TAG, 'Disconnecting WebSocket...');
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
            this.isSetupComplete = false;
        }
    }
}

export const geminiWebSocket = GeminiWebSocket.getInstance();
