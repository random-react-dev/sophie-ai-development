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
    hasGreeted: boolean;

    // Actions
    setConnectionState: (state: ConnectionState) => void;
    setError: (error: string | null) => void;
    setListening: (isListening: boolean) => void;
    setSpeaking: (isSpeaking: boolean) => void;
    setVolumeLevel: (level: number) => void;
    setShowTranscript: (show: boolean) => void;
    setHasGreeted: (hasGreeted: boolean) => void;
    addMessage: (role: 'user' | 'model', text: string) => void;
    clearMessages: () => void;
    handleInterruption: () => void;
    reset: () => void;
    startGlobalRecording: () => Promise<void>;
    stopGlobalRecording: () => Promise<void>;
    toggleGlobalRecording: () => Promise<void>;
}

const initialState = {
    connectionState: 'idle' as ConnectionState,
    error: null,
    isListening: false,
    isSpeaking: false,
    volumeLevel: 0,
    showTranscript: false,
    messages: [] as Message[],
    hasGreeted: false,
};

export const useConversationStore = create<ConversationState>((set, get) => ({
    ...initialState,

    setConnectionState: (connectionState: ConnectionState) => set({ connectionState }),

    setError: (error: string | null) => set({ error }),

    setListening: (isListening: boolean) => set({ isListening }),

    setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),

    setVolumeLevel: (volumeLevel: number) => set({ volumeLevel }),

    setShowTranscript: (showTranscript: boolean) => set({ showTranscript }),

    setHasGreeted: (hasGreeted: boolean) => set({ hasGreeted }),

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

    startGlobalRecording: async () => {
        const state = get();
        if (state.isListening) return;

        const { audioRecorder } = await import('../services/audio/recorder');
        const { geminiWebSocket } = await import('../services/gemini/websocket');
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        // First press logic: send greeting
        if (!state.hasGreeted) {
            if (state.connectionState === 'connected') {
                geminiWebSocket.sendGreeting();
                set({ hasGreeted: true });
                await impactAsync(ImpactFeedbackStyle.Medium);
            } else {
                console.warn('Cannot greet: WebSocket not connected');
            }
            return;
        }

        // Subsequent press: record
        if (state.connectionState !== 'connected') {
            console.warn('Cannot record: WebSocket not connected');
            return;
        }

        try {
            await audioRecorder.start({
                onAudioData: (base64) => {
                    geminiWebSocket.sendAudioChunk(base64);
                },
                onVolumeChange: (rms) => {
                    set({ volumeLevel: rms });
                }
            });
            await impactAsync(ImpactFeedbackStyle.Medium);
            set({ isListening: true });
        } catch (error) {
            console.error('Failed to start recording', error);
        }
    },

    stopGlobalRecording: async () => {
        const state = get();
        if (!state.hasGreeted || !state.isListening) {
            set({ volumeLevel: 0 });
            return;
        }

        const { audioRecorder } = await import('../services/audio/recorder');
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        try {
            await audioRecorder.stop();
            await impactAsync(ImpactFeedbackStyle.Light);
            set({ isListening: false, volumeLevel: 0 });
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    },

    toggleGlobalRecording: async () => {
        const state = get();
        if (state.isListening) {
            await state.stopGlobalRecording();
        } else {
            await state.startGlobalRecording();
        }
    },
}));

// Selector for backward compatibility
export const selectIsConnected = (state: ConversationState): boolean =>
    state.connectionState === 'connected';
