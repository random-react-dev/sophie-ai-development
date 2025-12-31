export interface GeminiSetupMessage {
    setup: {
        model: string;
        generationConfig: {
            responseModalities: string[];
            speechConfig?: { 
                voiceConfig?: { 
                    prebuiltVoiceConfig?: { 
                        voiceName: string 
                    } 
                } 
            };
        };
        systemInstruction?: { parts: { text: string }[] };
        inputAudioTranscription?: {};
        outputAudioTranscription?: {};
    };
}

export interface GeminiRealtimeInput {
    realtimeInput: {
        audio: {
            mimeType: string;
            data: string;
        };
    };
}

export interface GeminiClientContent {
    clientContent: {
        turns: Array<{
            role: 'user' | 'model';
            parts: Array<{ text: string }>;
        }>;
        turnComplete: boolean;
    }
}

export interface GeminiServerResponse {
    setupComplete?: {};
    serverContent?: {
        modelTurn?: {
            parts: Array<{ 
                inlineData?: { 
                    mimeType: string; 
                    data: string 
                }, 
                text?: string 
            }>;
        };
        turnComplete?: boolean;
        interrupted?: boolean;
        inputTranscription?: { text: string };
        outputTranscription?: { text: string };
    };
    toolCall?: {
        functionCalls: Array<{
            id: string;
            name: string;
            args: Record<string, unknown>;
        }>;
    };
}
