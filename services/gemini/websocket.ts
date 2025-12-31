import { useConversationStore } from '../../stores/conversationStore';
import { audioPlayer } from '../audio/player';
import { GeminiRealtimeInput, GeminiServerResponse, GeminiSetupMessage, GeminiClientContent } from './types';
import { Logger } from '../common/Logger';

const TAG = 'GeminiWS';
const MODEL = 'models/gemini-2.5-flash-native-audio-preview-09-2025';

class GeminiWebSocket {
    private ws: WebSocket | null = null;
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
        Logger.info(TAG, `Connecting to Gemini Live API with model ${MODEL}...`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                Logger.info(TAG, 'WebSocket Connected successfully');
                this.isConnected = true;
                this.isSetupComplete = false;
                this.sendSetupMessage(systemInstruction);
            };

            this.ws.onmessage = async (event: MessageEvent) => {
                try {
                    let data = event.data;
                    if (data instanceof Blob) {
                        data = await data.text();
                    }
                    if (typeof data === 'string') {
                        const response = JSON.parse(data) as GeminiServerResponse;
                        Logger.debug(TAG, `Server Message Keys: ${Object.keys(response).join(', ')}`);
                        this.handleMessage(response);
                    }
                } catch (error) {
                    Logger.error(TAG, 'Error parsing WebSocket message', error);
                }
            };

            this.ws.onclose = (event) => {
                if (event.code === 1000) {
                    Logger.info(TAG, 'WebSocket Closed Gracefully (1000)');
                } else {
                    Logger.warn(TAG, `WebSocket Closed Abnormally. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
                }
                this.isConnected = false;
                this.isSetupComplete = false;
                this.ws = null;
                const store = useConversationStore.getState();
                store.setIsConnected(false);
            };

            this.ws.onerror = (error: any) => {
                Logger.error(TAG, 'WebSocket Error', error.message || error || 'Unknown WebSocket error');
            };
        } catch (error) {
            Logger.error(TAG, 'Failed to initialize WebSocket', error);
        }
    }

    sendSetupMessage(instruction: string) {
        Logger.info(TAG, 'Sending setup message...');
        const defaultInstruction = "You are Sophie, a friendly AI language tutor. You help users master real-world conversation. When a user makes a mistake, provide a 'Natural Correction'—a more native way to say it—and explain the nuance briefly. Keep your spoken responses short and encouraging. Always respond in the target language unless an English explanation is needed for clarity.";
        
        const setupMsg: GeminiSetupMessage = {
            setup: {
                model: MODEL,
                generationConfig: {
                    responseModalities: ["AUDIO"]
                },
                systemInstruction: {
                    parts: [{ text: instruction || defaultInstruction }]
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {}
            }
        };
        this.send(JSON.stringify(setupMsg));
    }

    sendAudioChunk(base64Data: string) {
        if (!this.isConnected || !this.ws) {
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

        if (response.setupComplete) {
            Logger.info(TAG, 'Handshake complete: setupComplete received');
            this.isSetupComplete = true;
            store.setIsConnected(true);

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

        if (response.serverContent) {
            const { modelTurn, inputTranscription, outputTranscription } = response.serverContent;

            if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
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

            if (inputTranscription?.text) {
                Logger.info(TAG, `User transcribed: ${inputTranscription.text}`);
            }

            if (outputTranscription?.text) {
                Logger.info(TAG, `Model transcribed: ${outputTranscription.text}`);
            }

            if (response.serverContent.turnComplete) {
                Logger.debug(TAG, 'Turn complete');
            }

            if (response.serverContent.interrupted) {
                Logger.info(TAG, 'Model interrupted by user');
                audioPlayer.clearQueue();
                store.handleInterruption();
            }
        }
    }

    disconnect() {
        if (this.ws) {
            Logger.info(TAG, 'Disconnecting WebSocket...');
            try {
                this.ws.close(1000, 'User disconnected');
            } catch (e) {
                Logger.error(TAG, 'Error closing WebSocket', e);
            }
            this.ws = null;
            this.isConnected = false;
            this.isSetupComplete = false;
        }
    }
}

export const geminiWebSocket = GeminiWebSocket.getInstance();
