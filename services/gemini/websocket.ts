import ReconnectingWebSocket from 'reconnecting-websocket';
import { audioPlayer } from '../audio/player';
import { GeminiRealtimeInput, GeminiServerResponse, GeminiSetupMessage } from './types';

class GeminiWebSocket {
    private ws: ReconnectingWebSocket | null = null;
    private url = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
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
        if (this.isConnected) return;

        // Construct URL with API Key if simpler authentication is needed for prototype
        // or use headers if supported by WebSocket client (standard WS API doesn't support custom headers easily in browser/RN without polyfills)
        // With ReconnectingWebSocket, we pass the URL.
        const wsUrl = `${this.url}?key=${apiKey}`;

        this.ws = new ReconnectingWebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Gemini WebSocket Connected');
            this.isConnected = true;
            this.sendSetupMessage(systemInstruction);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                // event.data can be Blob or string. Need to handle based on type.
                // Usually text JSON for Gemini Live API.
                let data = event.data;
                if (typeof data === 'string') {
                    const response = JSON.parse(data) as GeminiServerResponse;
                    this.handleMessage(response);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('Gemini WebSocket Disconnected');
            this.isConnected = false;
        };

        this.ws.onerror = (error: any) => {
            console.error('Gemini WebSocket Error:', error);
        };
    }

    sendSetupMessage(instruction: string) {
        const setupMsg: GeminiSetupMessage = {
            setup: {
                model: "models/gemini-2.0-flash-exp",
                generation_config: {
                    response_modalities: ["AUDIO"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: "Aoede" // Example voice
                            }
                        }
                    }
                },
                system_instruction: {
                    parts: [{ text: instruction }]
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
        if (response.serverContent?.modelTurn) {
            const parts = response.serverContent.modelTurn.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                    // Queue audio for playback
                    audioPlayer.queueAudio(part.inlineData.data);
                }
            }
        }

        if (response.serverContent?.interrupted) {
            audioPlayer.clearQueue();
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
