import { create } from 'zustand';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

interface ConversationState {
    isConnected: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    volumeLevel: number;
    showTranscript: boolean;
    messages: Message[];
    connect: (lessonId: string) => Promise<void>;
    disconnect: () => void;
    setListening: (isListening: boolean) => void;
    setSpeaking: (isSpeaking: boolean) => void;
    setVolumeLevel: (level: number) => void;
    setIsConnected: (connected: boolean) => void;
    setShowTranscript: (show: boolean) => void;
    addMessage: (role: 'user' | 'model', text: string) => void;
    clearMessages: () => void;
    handleInterruption: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    volumeLevel: 0,
    showTranscript: false,
    messages: [],
    connect: async (lessonId: string) => {
        // TODO: Implement actual WebSocket connection logic here or inside the component/hook using this store
        set({ isConnected: true });
    },
    disconnect: () => {
        // TODO: Cleanup
        set({ isConnected: false, isListening: false, isSpeaking: false });
    },
    setListening: (isListening: boolean) => set({ isListening }),
    setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),
    setVolumeLevel: (volumeLevel: number) => set({ volumeLevel }),
    setIsConnected: (isConnected: boolean) => set({ isConnected }),
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
}));
