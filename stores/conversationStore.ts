import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { audioRecorder } from "../services/audio/recorder";
import { audioStreamer } from "../services/audio/streamer";
import { Logger } from "../services/common/Logger";
import { ConnectionState } from "../services/gemini/types";
import { geminiWebSocket } from "../services/gemini/websocket";

const VOLUME_THROTTLE_MS = 100;
const MIN_PTT_DURATION_MS = 1000;

let lastVolumeUpdate = 0;
let pttTurnCounter = 0;
let activePTTTurnId: number | null = null;
let isPTTStartInFlight = false;
let isPTTStopInFlight = false;
let activityStartSentTurnId: number | null = null;
let activityEndSentTurnId: number | null = null;
let pttFramesSentInTurn = 0;

/**
 * Create throttled volume handler to reduce re-renders.
 */
function createVolumeHandler(
  setState: (state: Partial<ConversationState>) => void,
): (rms: number) => void {
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
  role: "user" | "model";
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
  bufferProgress: number; // 0-100 audio buffer fill progress

  // UI state
  showTranscript: boolean;
  messages: Message[];
  hasGreeted: boolean;
  sessionProfileId: string | null;
  activeScenarioTimestamp: number;

  // Actions
  setConnectionState: (state: ConnectionState) => void;
  setError: (error: string | null) => void;
  setListening: (isListening: boolean) => void;
  setSpeaking: (isSpeaking: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setVolumeLevel: (level: number) => void;
  setBufferProgress: (progress: number) => void;
  setShowTranscript: (show: boolean) => void;
  setHasGreeted: (hasGreeted: boolean) => void;
  setSessionProfileId: (id: string | null) => void;
  setActiveScenarioTimestamp: (timestamp: number) => void;
  addMessage: (role: "user" | "model", text: string) => void;
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
  connectionState: "idle" as ConnectionState,
  error: null,
  isConversationActive: false,
  isListening: false,
  isSpeaking: false,
  isProcessing: false,
  isPTTActive: false,
  pttStartTime: null as number | null,
  volumeLevel: 0,
  bufferProgress: 0,
  showTranscript: false,
  messages: [] as Message[],
  hasGreeted: false,
  sessionProfileId: null as string | null,
  activeScenarioTimestamp: 0,
};

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
  ...initialState,

  setConnectionState: (connectionState: ConnectionState) =>
    set({ connectionState }),

  setError: (error: string | null) => set({ error }),

  setListening: (isListening: boolean) => set({ isListening }),

  setSpeaking: (isSpeaking: boolean) => set({ isSpeaking }),

  setProcessing: (isProcessing: boolean) => set({ isProcessing }),

  setVolumeLevel: (volumeLevel: number) => set({ volumeLevel }),

  setBufferProgress: (bufferProgress: number) => set({ bufferProgress }),

  setShowTranscript: (showTranscript: boolean) => set({ showTranscript }),

  setHasGreeted: (hasGreeted: boolean) => set({ hasGreeted }),

  setSessionProfileId: (sessionProfileId: string | null) =>
    set({ sessionProfileId }),

  setActiveScenarioTimestamp: (activeScenarioTimestamp: number) =>
    set({ activeScenarioTimestamp }),

  addMessage: (role: "user" | "model", text: string) =>
    set((state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      // If last message is from same role and within 5 seconds, append to it
      if (
        lastMsg &&
        lastMsg.role === role &&
        Date.now() - lastMsg.timestamp < 5000
      ) {
        const updatedMessages = [...state.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMsg,
          text: (lastMsg.text + " " + text).trim(),
          timestamp: Date.now(), // Reset timer for next chunk
        };
        return { messages: updatedMessages };
      }
      return {
        messages: [
          ...state.messages,
          {
            id: Math.random().toString(36).substring(7),
            role,
            text,
            timestamp: Date.now(),
          },
        ],
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
      Logger.warn(
        "ConversationStore",
        "Cannot start conversation: WebSocket not ready",
      );
      return;
    }

    const { impactAsync, ImpactFeedbackStyle } = await import("expo-haptics");
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
    Logger.info("ConversationStore", "Starting audio recording...");
    await audioRecorder.start({
      onAudioData: (base64) => geminiWebSocket.sendAudioChunk(base64),
      onVolumeChange: createVolumeHandler(set),
    });
    Logger.info("ConversationStore", "Audio recording started");
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

    const { impactAsync, ImpactFeedbackStyle } = await import("expo-haptics");

    Logger.info("ConversationStore", "Stopping conversation...");
    await audioRecorder.stop();
    audioStreamer.clearQueue();
    await impactAsync(ImpactFeedbackStyle.Light);

    set({
      isConversationActive: false,
      isListening: false,
      isSpeaking: false,
      volumeLevel: 0,
    });
    Logger.info("ConversationStore", "Conversation stopped");
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
    if (state.isPTTActive || isPTTStartInFlight || isPTTStopInFlight || !geminiWebSocket.isReady()) {
      if (!geminiWebSocket.isReady()) {
        Logger.warn(
          "ConversationStore",
          "Cannot start PTT: WebSocket not ready",
        );
      } else {
        Logger.debug(
          "ConversationStore",
          "Ignoring duplicate startPTTRecording call",
        );
      }
      return;
    }

    isPTTStartInFlight = true;
    const turnId = ++pttTurnCounter;
    activePTTTurnId = turnId;
    pttFramesSentInTurn = 0;

    // Set state IMMEDIATELY (synchronous) so UI responds.
    // pttStartTime is set later, right before audioRecorder.start(),
    // so MIN_PTT_DURATION_MS measures actual recording time (not setup time).
    set({
      isPTTActive: true,
      pttStartTime: null,
      isListening: true,
      isConversationActive: true,
      isProcessing: false,
    });

    try {
      const { impactAsync, ImpactFeedbackStyle } =
        await import("expo-haptics");
      await ensureAudioStreamerReady();
      await impactAsync(ImpactFeedbackStyle.Medium);

      // Bail out if stop ran while we were setting up
      if (!get().isPTTActive) {
        Logger.info("ConversationStore", "PTT cancelled during startup");
        return;
      }

      Logger.info("ConversationStore", `Starting PTT recording... Turn: ${turnId}`);
      if (activityStartSentTurnId !== turnId) {
        geminiWebSocket.sendActivityStart();
        activityStartSentTurnId = turnId;
        activityEndSentTurnId = null;
      }

      // Set pttStartTime NOW — right before recording starts — so the
      // minimum duration check in stop reflects actual recording time.
      set({ pttStartTime: Date.now() });

      await audioRecorder.start({
        onAudioData: (base64) => {
          if (
            activePTTTurnId !== turnId ||
            isPTTStopInFlight ||
            !get().isPTTActive
          ) {
            return;
          }
          pttFramesSentInTurn++;
          geminiWebSocket.sendAudioChunk(base64);
        },
        onVolumeChange: createVolumeHandler(set),
      });

      // If stop ran during audioRecorder.start(), clean up the orphan
      if (!get().isPTTActive) {
        Logger.info("ConversationStore", "PTT stopped during recorder start, cleaning up");
        await audioRecorder.stop();
      }
    } catch (err) {
      Logger.error("ConversationStore", "PTT recording failed to start", err);
      // Reset state so UI returns to normal
      set({
        isPTTActive: false,
        pttStartTime: null,
        isListening: false,
      });
      if (activePTTTurnId === turnId) {
        activePTTTurnId = null;
      }
    } finally {
      isPTTStartInFlight = false;
    }
  },

  /**
   * Stop push-to-talk recording.
   */
  stopPTTRecording: async () => {
    const state = get();
    if (!state.isPTTActive || isPTTStopInFlight) {
      if (isPTTStopInFlight) {
        Logger.debug(
          "ConversationStore",
          "Ignoring duplicate stopPTTRecording call",
        );
      }
      return;
    }

    isPTTStopInFlight = true;
    const turnId = activePTTTurnId;

    const { notificationAsync, NotificationFeedbackType } =
      await import("expo-haptics");
    const duration = state.pttStartTime ? Date.now() - state.pttStartTime : 0;
    let hasFrames = false;
    let isValidRecording = false;

    // Close PTT state first so any extra stop calls no-op immediately.
    set({
      isPTTActive: false,
      pttStartTime: null,
      isListening: false,
      volumeLevel: 0,
    });

    Logger.info(
      "ConversationStore",
      `Stopping PTT recording... Turn: ${turnId ?? "none"}, Duration: ${duration}ms`,
    );
    try {
      if (
        turnId !== null &&
        activityStartSentTurnId === turnId &&
        activityEndSentTurnId !== turnId
      ) {
        geminiWebSocket.sendActivityEnd();
        activityEndSentTurnId = turnId;
      }

      try {
        await audioRecorder.stop();
      } catch (err) {
        Logger.error("ConversationStore", "Failed to stop audio recorder", err);
      }

      hasFrames = pttFramesSentInTurn > 0;
      isValidRecording = duration >= MIN_PTT_DURATION_MS && hasFrames;

      set({
        isProcessing: isValidRecording,
      });

      await notificationAsync(
        isValidRecording
          ? NotificationFeedbackType.Success
          : NotificationFeedbackType.Warning,
      );

      if (!isValidRecording) {
        Logger.info(
          "ConversationStore",
          hasFrames
            ? `Recording too short: ${duration}ms - discarded`
            : `No audio frames captured: ${duration}ms - discarded`,
        );
      }
    } finally {
      if (activePTTTurnId === turnId) {
        activePTTTurnId = null;
      }
      pttFramesSentInTurn = 0;
      isPTTStopInFlight = false;
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
    }),
    {
      name: "sophie-conversation",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messages: state.messages,
        showTranscript: state.showTranscript,
      }),
    },
  ),
);

// Selector for backward compatibility
export const selectIsConnected = (state: ConversationState): boolean =>
  state.connectionState === "connected";

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const isListening = useIsListening();
// ============================================

// State selectors
export const useConnectionState = (): ConnectionState =>
  useConversationStore((s) => s.connectionState);
export const useError = (): string | null =>
  useConversationStore((s) => s.error);
export const useIsListening = (): boolean =>
  useConversationStore((s) => s.isListening);
export const useIsSpeaking = (): boolean =>
  useConversationStore((s) => s.isSpeaking);
export const useIsProcessing = (): boolean =>
  useConversationStore((s) => s.isProcessing);
export const useIsPTTActive = (): boolean =>
  useConversationStore((s) => s.isPTTActive);
export const useVolumeLevel = (): number =>
  useConversationStore((s) => s.volumeLevel);
export const useBufferProgress = (): number =>
  useConversationStore((s) => s.bufferProgress);
export const useMessages = (): Message[] =>
  useConversationStore((s) => s.messages);
export const useShowTranscript = (): boolean =>
  useConversationStore((s) => s.showTranscript);
export const useIsConversationActive = (): boolean =>
  useConversationStore((s) => s.isConversationActive);

// Action selectors (stable references - won't cause re-renders)
export const useConversationActions = (): {
  setShowTranscript: (show: boolean) => void;
  clearMessages: () => void;
  setHasGreeted: (hasGreeted: boolean) => void;
  stopConversation: () => Promise<void>;
  startConversation: () => Promise<void>;
  toggleConversation: () => Promise<void>;
  startPTTRecording: () => Promise<void>;
  stopPTTRecording: () => Promise<void>;
  handleInterruption: () => void;
} =>
  useConversationStore((s) => ({
    setShowTranscript: s.setShowTranscript,
    clearMessages: s.clearMessages,
    setHasGreeted: s.setHasGreeted,
    stopConversation: s.stopConversation,
    startConversation: s.startConversation,
    toggleConversation: s.toggleConversation,
    startPTTRecording: s.startPTTRecording,
    stopPTTRecording: s.stopPTTRecording,
    handleInterruption: s.handleInterruption,
  }));

// ============================================
// Persisted Intro Store - One-time intro flag
// ============================================

interface IntroState {
  hasSeenIntro: boolean;
  setHasSeenIntro: (value: boolean) => void;
}

export const useIntroStore = create<IntroState>()(
  persist(
    (set) => ({
      hasSeenIntro: false,
      setHasSeenIntro: (hasSeenIntro: boolean) => set({ hasSeenIntro }),
    }),
    {
      name: "sophie-intro-state",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
