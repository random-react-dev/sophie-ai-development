import ReconnectingWebSocket from 'reconnecting-websocket';
import { useConversationStore } from '../../stores/conversationStore';
import { audioPlayer } from '../audio/player';
import { GeminiRealtimeInput, GeminiServerResponse, GeminiSetupMessage } from './types';

class GeminiWebSocket {
    private ws: ReconnectingWebSocket | null = null;
    private url = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
    private isConnected = false;

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
        if (this.ws || this.isConnected) return;

        const wsUrl = `${this.url}?key=${apiKey}`;

        this.ws = new ReconnectingWebSocket(wsUrl, [], {
            maxRetries: 5,
            connectionTimeout: 5000,
            debug: false,
        });

        this.ws.onopen = () => {
            console.log('Gemini WebSocket Connected successfully');
            this.isConnected = true;
            this.sendSetupMessage(systemInstruction);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                let data = event.data;
                if (typeof data === 'string') {
                    const response = JSON.parse(data) as GeminiServerResponse;
                    this.handleMessage(response);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            if (event.code !== 1000) {
                console.warn(`Gemini WebSocket Closed Abnormally. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
            } else {
                console.log('Gemini WebSocket Closed Gracefully');
            }
            this.isConnected = false;
        };

        this.ws.onerror = (error: any) => {
            console.error('Gemini WebSocket Error:', error.message || error || 'Unknown WebSocket error');
        };
    }

    sendSetupMessage(instruction: string) {
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
        if (!this.isConnected) return;

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
        }
    }

    private handleMessage(response: GeminiServerResponse) {
        const store = useConversationStore.getState();

        if (response.serverContent?.modelTurn) {
            const parts = response.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                    audioPlayer.queueAudio(part.inlineData.data);
                }
                if (part.text) {
                    // Accumulate text or add as message
                    // For prototype, we'll just add it
                    store.addMessage('model', part.text);
                }
            }
        }

        if (response.serverContent?.turnComplete) {
            // AudioPlayer will handle setSpeaking(false) when queue is drained
            console.log("Turn complete");
        }

        if (response.serverContent?.interrupted) {
            audioPlayer.clearQueue();
            store.handleInterruption();
            console.log("Model interrupted");
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }
}

export const geminiWebSocket = GeminiWebSocket.getInstance();
