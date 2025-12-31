import { create } from 'zustand';
import { ConnectionState } from '../services/gemini/types';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

interface ConversationState {
    // Connection state
    connectionState: ConnectionState;
    error: string | null;

    // Recording/Speaking state
    isListening: boolean;
    isSpeaking: boolean;
    volumeLevel: number;

    // UI state
    showTranscript: boolean;
    messages: Message[];

    // Actions
    setConnectionState: (state: ConnectionState) => void;
    setError: (error: string | null) => void;
    setListening: (isListening: boolean) => void;
    setSpeaking: (isSpeaking: boolean) => void;
    setVolumeLevel: (level: number) => void;
    setShowTranscript: (show: boolean) => void;
    addMessage: (role: 'user' | 'model', text: string) => void;
    clearMessages: () => void;
    handleInterruption: () => void;
    reset: () => void;
}

const initialState = {
    connectionState: 'idle' as ConnectionState,
    error: null,
    isListening: false,
    isSpeaking: false,
    volumeLevel: 0,
    showTranscript: false,
    messages: [] as Message[],
};

export const useConversationStore = create<ConversationState>((set) => ({
    ...initialState,

    setConnectionState: (connectionState: ConnectionState) => set({ connectionState }),

    setError: (error: string | null) => set({ error }),

    setListening: (isListening: boolean) => set({ isListening }),

    setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),

    setVolumeLevel: (volumeLevel: number) => set({ volumeLevel }),

    setShowTranscript: (showTranscript: boolean) => set({ showTranscript }),

    addMessage: (role: 'user' | 'model', text: string) => set((state) => {
        const lastMsg = state.messages[state.messages.length - 1];
        // If last message is from same role and within 5 seconds, append to it
        if (lastMsg && lastMsg.role === role && (Date.now() - lastMsg.timestamp < 5000)) {
            const updatedMessages = [...state.messages];
            updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                text: (lastMsg.text + ' ' + text).trim(),
                timestamp: Date.now() // Reset timer for next chunk
            };
            return { messages: updatedMessages };
        }
        return {
            messages: [...state.messages, {
                id: Math.random().toString(36).substring(7),
                role,
                text,
                timestamp: Date.now(),
            }]
        };
    }),

    clearMessages: () => set({ messages: [] }),

    handleInterruption: () => set({ isSpeaking: false }),

    reset: () => set(initialState),
}));

// Selector for backward compatibility
export const selectIsConnected = (state: ConversationState): boolean =>
    state.connectionState === 'connected';
