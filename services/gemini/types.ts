// Connection state machine for robust connection handling
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Message role union type
export type MessageRole = 'user' | 'model';

// Setup message types (using snake_case to match API)
export interface GeminiSetupMessage {
    setup: {
        model: string;
        generation_config: {
            response_modalities: string[];
            speech_config?: {
                voice_config?: {
                    prebuilt_voice_config?: {
                        voice_name: string;
                    };
                };
            };
        };
        system_instruction?: { parts: Array<{ text: string }> };
        input_audio_transcription?: Record<string, never>;
        output_audio_transcription?: Record<string, never>;
    };
}

// Realtime audio input message
export interface GeminiRealtimeInput {
    realtimeInput: {
        audio: {
            mimeType: string;
            data: string;
        };
    };
}

// Client content message (for text prompts)
export interface GeminiClientContent {
    clientContent: {
        turns: Array<{
            role: MessageRole;
            parts: Array<{ text: string }>;
        }>;
        turnComplete: boolean;
    };
}

// Audio inline data structure
export interface AudioInlineData {
    mime_type: string;
    data: string;
}

// Part within a model turn
export interface GeminiPart {
    inline_data?: AudioInlineData;
    text?: string;
}

// Server content from Gemini
export interface GeminiServerContent {
    model_turn?: {
        parts: Array<GeminiPart>;
    };
    turn_complete?: boolean;
    interrupted?: boolean;
    input_transcription?: { text: string };
    output_transcription?: { text: string };
}

// Complete server response
export interface GeminiServerResponse {
    setup_complete?: Record<string, never>;
    server_content?: GeminiServerContent;
    tool_call?: {
        function_calls: Array<{
            id: string;
            name: string;
            args: Record<string, unknown>;
        }>;
    };
}

// Error types for categorized error handling
export type GeminiErrorType = 'connection' | 'auth' | 'rate_limit' | 'server' | 'unknown';

export interface GeminiError {
    type: GeminiErrorType;
    message: string;
    code?: number;
    retryable: boolean;
}
