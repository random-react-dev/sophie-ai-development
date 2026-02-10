// Connection state machine for robust connection handling
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// Message role union type
export type MessageRole = "user" | "model";

// Setup message types (using snake_case to match API request format)
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

// Audio inline data structure (supports both snake_case and camelCase from API)
export interface AudioInlineData {
  mime_type?: string;
  mimeType?: string;
  data: string;
}

// Part within a model turn (supports both formats)
export interface GeminiPart {
  inline_data?: AudioInlineData;
  inlineData?: AudioInlineData;
  text?: string;
}

// Server content from Gemini (supports both snake_case and camelCase)
export interface GeminiServerContent {
  model_turn?: {
    parts: Array<GeminiPart>;
  };
  modelTurn?: {
    parts: Array<GeminiPart>;
  };
  turn_complete?: boolean;
  turnComplete?: boolean;
  generation_complete?: boolean;
  generationComplete?: boolean;
  interrupted?: boolean;
  input_transcription?: { text: string };
  inputTranscription?: { text: string };
  output_transcription?: { text: string };
  outputTranscription?: { text: string };
}

// Complete server response (supports both formats the API might return)
export interface GeminiServerResponse {
  setup_complete?: Record<string, never>;
  setupComplete?: Record<string, never>;
  server_content?: GeminiServerContent;
  serverContent?: GeminiServerContent;
  tool_call?: {
    function_calls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
}

// Error types for categorized error handling
export type GeminiErrorType =
  | "connection"
  | "auth"
  | "rate_limit"
  | "server"
  | "unknown";

export interface GeminiError {
  type: GeminiErrorType;
  message: string;
  code?: number;
  retryable: boolean;
}
