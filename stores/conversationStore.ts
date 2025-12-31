import { create } from 'zustand';

interface ConversationState {
    isConnected: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    volumeLevel: number;
    connect: (lessonId: string) => Promise<void>;
    disconnect: () => void;
    setListening: (isListening: boolean) => void;
    setSpeaking: (isSpeaking: boolean) => void;
    setVolumeLevel: (level: number) => void;
    setIsConnected: (connected: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    volumeLevel: 0,
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
}));
