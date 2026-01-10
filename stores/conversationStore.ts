import { create } from 'zustand';
import { Logger } from '../services/common/Logger';
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

    // Conversation mode state
    isConversationActive: boolean; // Whether conversation mode is on
    isListening: boolean; // Whether currently recording audio
    isSpeaking: boolean; // Whether AI is speaking
    isPTTActive: boolean; // Whether currently holding to speak (PTT mode)
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

    // Conversation mode actions
    startConversation: () => Promise<void>;
    stopConversation: () => Promise<void>;
    toggleConversation: () => Promise<void>;

    // Push-to-talk (PTT) actions
    startPTTRecording: () => Promise<void>;
    stopPTTRecording: () => Promise<void>;

    // Legacy actions (deprecated, kept for compatibility)
    startGlobalRecording: () => Promise<void>;
    stopGlobalRecording: () => Promise<void>;
    toggleGlobalRecording: () => Promise<void>;
}

const initialState = {
    connectionState: 'idle' as ConnectionState,
    error: null,
    isConversationActive: false,
    isListening: false,
    isSpeaking: false,
    isPTTActive: false,
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

    /**
     * Start continuous conversation mode.
     * Sends greeting on first activation, then starts continuous audio recording.
     */
    startConversation: async () => {
        const state = get();

        // Already in conversation mode
        if (state.isConversationActive) return;

        const { audioRecorder } = await import('../services/audio/recorder');
        const { audioStreamer } = await import('../services/audio/streamer');
        const { geminiWebSocket } = await import('../services/gemini/websocket');
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        // Check connection
        if (!geminiWebSocket.isReady()) {
            Logger.warn('ConversationStore', 'Cannot start conversation: WebSocket not ready');
            return;
        }

        // Initialize audio streamer before starting
        await audioStreamer.initialize();

        await impactAsync(ImpactFeedbackStyle.Medium);

        // Helper to start recording with logging
        const startRecording = async () => {
            Logger.info('ConversationStore', 'Starting audio recording...');
            await audioRecorder.start({
                onAudioData: (base64) => {
                    geminiWebSocket.sendAudioChunk(base64);
                },
                onVolumeChange: (rms) => {
                    set({ volumeLevel: rms });
                }
            });
            Logger.info('ConversationStore', 'Audio recording started');
            set({ isListening: true });
        };

        // Send greeting if not greeted yet
        if (!state.hasGreeted) {
            geminiWebSocket.sendGreeting();
            set({ hasGreeted: true, isConversationActive: true });

            // Start recording immediately - no delay needed
            try {
                await startRecording();
            } catch (error) {
                Logger.error('ConversationStore', 'Failed to start recording after greeting', error);
            }
            return;
        }

        // Already greeted, start recording immediately
        try {
            await startRecording();
            set({ isConversationActive: true });
        } catch (error) {
            Logger.error('ConversationStore', 'Failed to start recording', error);
        }
    },

    /**
     * Stop continuous conversation mode.
     */
    stopConversation: async () => {
        const state = get();

        if (!state.isConversationActive) {
            set({ volumeLevel: 0 });
            return;
        }

        const { audioRecorder } = await import('../services/audio/recorder');
        const { audioStreamer } = await import('../services/audio/streamer');
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        try {
            Logger.info('ConversationStore', 'Stopping conversation...');
            await audioRecorder.stop();
            audioStreamer.clearQueue();
            await impactAsync(ImpactFeedbackStyle.Light);
            set({
                isConversationActive: false,
                isListening: false,
                isSpeaking: false,
                volumeLevel: 0
            });
            Logger.info('ConversationStore', 'Conversation stopped');
        } catch (error) {
            Logger.error('ConversationStore', 'Failed to stop conversation', error);
        }
    },

    /**
     * Toggle conversation mode on/off.
     */
    toggleConversation: async () => {
        const state = get();
        if (state.isConversationActive) {
            await state.stopConversation();
        } else {
            await state.startConversation();
        }
    },

    /**
     * Start push-to-talk recording (hold to speak).
     * Called when user presses down on mic button.
     */
    startPTTRecording: async () => {
        const state = get();

        // Don't start if already recording
        if (state.isPTTActive) return;

        const { audioRecorder } = await import('../services/audio/recorder');
        const { audioStreamer } = await import('../services/audio/streamer');
        const { geminiWebSocket } = await import('../services/gemini/websocket');
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        if (!geminiWebSocket.isReady()) {
            Logger.warn('ConversationStore', 'Cannot start PTT: WebSocket not ready');
            return;
        }

        // Initialize audio streamer
        await audioStreamer.initialize();

        // Haptic feedback
        await impactAsync(ImpactFeedbackStyle.Medium);

        // Start recording
        Logger.info('ConversationStore', 'Starting PTT recording...');
        await audioRecorder.start({
            onAudioData: (base64) => {
                geminiWebSocket.sendAudioChunk(base64);
            },
            onVolumeChange: (rms) => {
                set({ volumeLevel: rms });
            }
        });

        set({
            isPTTActive: true,
            isListening: true,
            isConversationActive: true
        });
    },

    /**
     * Stop push-to-talk recording.
     * Called when user releases mic button.
     */
    stopPTTRecording: async () => {
        const state = get();

        if (!state.isPTTActive) return;

        const { audioRecorder } = await import('../services/audio/recorder');
        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        Logger.info('ConversationStore', 'Stopping PTT recording...');
        await audioRecorder.stop();

        // Haptic feedback
        await impactAsync(ImpactFeedbackStyle.Light);

        set({
            isPTTActive: false,
            isListening: false,
            volumeLevel: 0
            // Keep isConversationActive true - conversation continues
        });
    },

    // Legacy methods - redirect to conversation mode
    startGlobalRecording: async () => {
        await get().startConversation();
    },

    stopGlobalRecording: async () => {
        // In conversation mode, we don't stop on release
        // This is now a no-op to prevent stopping when releasing mic button
    },

    toggleGlobalRecording: async () => {
        await get().toggleConversation();
    },
}));

// Selector for backward compatibility
export const selectIsConnected = (state: ConversationState): boolean =>
    state.connectionState === 'connected';
