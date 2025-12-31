export interface GeminiSetupMessage {
    setup: {
        model: string;
        generation_config: {
            response_modalities: string[];
            speech_config: { voice_config: { prebuilt_voice_config: { voice_name: string } } };
        };
        system_instruction: { parts: { text: string }[] };
    };
}

export interface GeminiRealtimeInput {
    realtime_input: {
        media_chunks: Array<{ mime_type: string; data: string }>;
    };
}

export interface GeminiClientContent {
    client_content: {
        turns: Array<{ parts: Array<{ text: string }> }>;
        turn_complete: boolean;
    }
}

export interface GeminiServerResponse {
    serverContent?: {
        modelTurn?: {
            parts: Array<{ inlineData?: { mimeType: string; data: string }, text?: string }>;
        };
        turnComplete?: boolean;
        interrupted?: boolean;
    };
    toolCall?: any;
}
