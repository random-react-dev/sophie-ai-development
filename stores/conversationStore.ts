import { create } from 'zustand';
import { Logger } from '../services/common/Logger';
import { ConnectionState } from '../services/gemini/types';
import { audioRecorder } from '../services/audio/recorder';
import { audioStreamer } from '../services/audio/streamer';
import { geminiWebSocket } from '../services/gemini/websocket';

const VOLUME_THROTTLE_MS = 100;
const MIN_PTT_DURATION_MS = 1000;

let lastVolumeUpdate = 0;

/**
 * Create throttled volume handler to reduce re-renders.
 */
function createVolumeHandler(setState: (state: Partial<ConversationState>) => void): (rms: number) => void {
    return (rms: number): void => {
        const now = Date.now();
        if (now - lastVolumeUpdate >= VOLUME_THROTTLE_MS) {
            lastVolumeUpdate = now;
            setState({ volumeLevel: rms });
        }
    };
}

/**
 * Ensure audio streamer is initialized before use.
 */
async function ensureAudioStreamerReady(): Promise<void> {
    if (!audioStreamer.isReady()) {
        await audioStreamer.initialize();
    }
}

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
    isProcessing: boolean; // Whether AI is processing user's audio (after PTT release)
    isPTTActive: boolean; // Whether currently holding to speak (PTT mode)
    pttStartTime: number | null; // Timestamp when PTT recording started
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
    setProcessing: (isProcessing: boolean) => void;
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
    isProcessing: false,
    isPTTActive: false,
    pttStartTime: null as number | null,
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

    setProcessing: (isProcessing: boolean) => set({ isProcessing }),

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
        if (state.isConversationActive) return;

        if (!geminiWebSocket.isReady()) {
            Logger.warn('ConversationStore', 'Cannot start conversation: WebSocket not ready');
            return;
        }

        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
        await ensureAudioStreamerReady();
        await impactAsync(ImpactFeedbackStyle.Medium);

        // Send greeting on first activation
        if (!state.hasGreeted) {
            geminiWebSocket.sendGreeting();
            set({ hasGreeted: true, isConversationActive: true });
        } else {
            set({ isConversationActive: true });
        }

        // Start recording
        Logger.info('ConversationStore', 'Starting audio recording...');
        await audioRecorder.start({
            onAudioData: (base64) => geminiWebSocket.sendAudioChunk(base64),
            onVolumeChange: createVolumeHandler(set),
        });
        Logger.info('ConversationStore', 'Audio recording started');
        set({ isListening: true });
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

        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');

        Logger.info('ConversationStore', 'Stopping conversation...');
        await audioRecorder.stop();
        audioStreamer.clearQueue();
        await impactAsync(ImpactFeedbackStyle.Light);

        set({
            isConversationActive: false,
            isListening: false,
            isSpeaking: false,
            volumeLevel: 0,
        });
        Logger.info('ConversationStore', 'Conversation stopped');
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
     */
    startPTTRecording: async () => {
        const state = get();
        if (state.isPTTActive || !geminiWebSocket.isReady()) {
            if (!geminiWebSocket.isReady()) {
                Logger.warn('ConversationStore', 'Cannot start PTT: WebSocket not ready');
            }
            return;
        }

        const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
        await ensureAudioStreamerReady();
        await impactAsync(ImpactFeedbackStyle.Medium);

        Logger.info('ConversationStore', 'Starting PTT recording...');
        geminiWebSocket.sendActivityStart();

        await audioRecorder.start({
            onAudioData: (base64) => geminiWebSocket.sendAudioChunk(base64),
            onVolumeChange: createVolumeHandler(set),
        });

        set({
            isPTTActive: true,
            pttStartTime: Date.now(),
            isListening: true,
            isConversationActive: true,
            isProcessing: false,
        });
    },

    /**
     * Stop push-to-talk recording.
     */
    stopPTTRecording: async () => {
        const state = get();
        if (!state.isPTTActive) return;

        const { notificationAsync, NotificationFeedbackType } = await import('expo-haptics');
        const duration = state.pttStartTime ? Date.now() - state.pttStartTime : 0;
        const isValidRecording = duration >= MIN_PTT_DURATION_MS;

        Logger.info('ConversationStore', `Stopping PTT recording... Duration: ${duration}ms`);
        await audioRecorder.stop();
        geminiWebSocket.sendActivityEnd();

        set({
            isPTTActive: false,
            pttStartTime: null,
            isListening: false,
            isProcessing: isValidRecording,
            volumeLevel: 0,
        });

        await notificationAsync(
            isValidRecording ? NotificationFeedbackType.Success : NotificationFeedbackType.Warning
        );

        if (!isValidRecording) {
            Logger.info('ConversationStore', `Recording too short: ${duration}ms - discarded`);
        }
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
