describe('conversationStore', () => {
  // We need to mock dependencies before importing the store
  let useConversationStore: typeof import('@/stores/conversationStore').useConversationStore;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the singleton services that the store imports
    jest.mock('@/services/audio/recorder', () => ({
      audioRecorder: {
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve()),
      },
    }));

    jest.mock('@/services/audio/streamer', () => ({
      audioStreamer: {
        isReady: jest.fn(() => false),
        initialize: jest.fn(() => Promise.resolve()),
        clearQueue: jest.fn(),
        handleInterruption: jest.fn(),
      },
    }));

    jest.mock('@/services/gemini/websocket', () => ({
      geminiWebSocket: {
        isReady: jest.fn(() => true),
        sendGreeting: jest.fn(),
        sendAudioChunk: jest.fn(),
        sendActivityStart: jest.fn(),
        sendActivityEnd: jest.fn(),
      },
    }));

    jest.resetModules();
    useConversationStore = require('@/stores/conversationStore').useConversationStore;
  });

  describe('initial state', () => {
    it('starts with idle connection', () => {
      const state = useConversationStore.getState();
      expect(state.connectionState).toBe('idle');
    });

    it('starts with no messages', () => {
      const state = useConversationStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('starts with PTT inactive', () => {
      const state = useConversationStore.getState();
      expect(state.isPTTActive).toBe(false);
      expect(state.pttStartTime).toBeNull();
    });

    it('starts with conversation inactive', () => {
      const state = useConversationStore.getState();
      expect(state.isConversationActive).toBe(false);
    });
  });

  describe('addMessage', () => {
    it('adds a new message', () => {
      const store = useConversationStore.getState();
      store.addMessage('user', 'Hello');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].text).toBe('Hello');
    });

    it('auto-merges same-role messages within 5 seconds', () => {
      const store = useConversationStore.getState();

      // First message
      store.addMessage('model', 'Hola');

      // Second message from same role within 5s
      store.addMessage('model', 'como estas?');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].text).toBe('Hola como estas?');
    });

    it('does NOT merge different roles', () => {
      const store = useConversationStore.getState();

      store.addMessage('user', 'Hi');
      store.addMessage('model', 'Hello!');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(2);
    });

    it('does NOT merge after 5 seconds', () => {
      const store = useConversationStore.getState();

      store.addMessage('model', 'First part');

      // Advance time past 5 seconds
      jest.useFakeTimers();
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 6000);

      store.addMessage('model', 'Second part');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(2);

      Date.now = originalNow;
      jest.useRealTimers();
    });
  });

  describe('clearMessages', () => {
    it('removes all messages', () => {
      const store = useConversationStore.getState();
      store.addMessage('user', 'Hello');
      store.addMessage('model', 'Hi');
      store.clearMessages();

      expect(useConversationStore.getState().messages).toEqual([]);
    });
  });

  describe('resetSessionState', () => {
    it('clears session context without resetting unrelated store state', () => {
      const store = useConversationStore.getState();
      store.addMessage('user', 'Hello');
      store.setHasGreeted(true);
      useConversationStore.setState({
        conversationSummary: 'Previous session summary',
        cachedPrefix: ['Old prompt prefix'],
        cachedSummaryHash: 'Previous session summary|true',
        cachedBaseSystemPrompt: 'Old tutor prompt',
        sessionProfileId: 'profile-123',
      });

      store.resetSessionState();

      const state = useConversationStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.contextWindowStart).toBe(0);
      expect(state.hasGreeted).toBe(false);
      expect(state.conversationSummary).toBe('');
      expect(state.cachedPrefix).toEqual([]);
      expect(state.cachedSummaryHash).toBe('');
      expect(state.cachedBaseSystemPrompt).toBe('');
      expect(state.sessionProfileId).toBe('profile-123');
    });
  });

  describe('handleInterruption', () => {
    it('sets isSpeaking to false', () => {
      const store = useConversationStore.getState();
      store.setSpeaking(true);
      store.handleInterruption();

      expect(useConversationStore.getState().isSpeaking).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const store = useConversationStore.getState();
      store.addMessage('user', 'Hello');
      store.setSpeaking(true);
      store.setListening(true);
      store.setConnectionState('connected');

      store.reset();

      const state = useConversationStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.isSpeaking).toBe(false);
      expect(state.isListening).toBe(false);
      expect(state.connectionState).toBe('idle');
      expect(state.isPTTActive).toBe(false);
    });
  });

  describe('setters', () => {
    it('setConnectionState', () => {
      useConversationStore.getState().setConnectionState('connected');
      expect(useConversationStore.getState().connectionState).toBe('connected');
    });

    it('setError', () => {
      useConversationStore.getState().setError('Something went wrong');
      expect(useConversationStore.getState().error).toBe('Something went wrong');
    });

    it('setError(null) clears error', () => {
      useConversationStore.getState().setError('error');
      useConversationStore.getState().setError(null);
      expect(useConversationStore.getState().error).toBeNull();
    });

    it('setShowTranscript', () => {
      useConversationStore.getState().setShowTranscript(true);
      expect(useConversationStore.getState().showTranscript).toBe(true);
    });

    it('setHasGreeted', () => {
      useConversationStore.getState().setHasGreeted(true);
      expect(useConversationStore.getState().hasGreeted).toBe(true);
    });

    it('setBufferProgress', () => {
      useConversationStore.getState().setBufferProgress(50);
      expect(useConversationStore.getState().bufferProgress).toBe(50);
    });
  });

  describe('buildGeminiPrompt', () => {
    it('rebuilds the cached prefix when the base prompt changes', () => {
      const store = useConversationStore.getState();

      const firstPrompt = store.buildGeminiPrompt('Tutor prompt');
      const secondPrompt =
        useConversationStore.getState().buildGeminiPrompt('Scenario prompt');

      expect(firstPrompt).toContain('Tutor prompt');
      expect(firstPrompt).not.toContain('Scenario prompt');
      expect(secondPrompt).toContain('Scenario prompt');
      expect(secondPrompt).not.toContain('Tutor prompt');
      expect(useConversationStore.getState().cachedBaseSystemPrompt).toBe(
        'Scenario prompt',
      );
    });
  });

  describe('startPTTRecording', () => {
    it('sets isPTTActive and isListening immediately', async () => {
      const store = useConversationStore.getState();
      // Don't await - check synchronous state
      const promise = store.startPTTRecording();

      const state = useConversationStore.getState();
      expect(state.isPTTActive).toBe(true);
      expect(state.isListening).toBe(true);
      expect(state.isConversationActive).toBe(true);

      await promise;
    });
  });

  describe('stopPTTRecording', () => {
    it('does nothing if PTT not active', async () => {
      await useConversationStore.getState().stopPTTRecording();
      // Should not throw
    });

    it('marks as not processing if recording too short (< 1000ms)', async () => {
      const store = useConversationStore.getState();

      // Start PTT
      await store.startPTTRecording();

      // Immediately stop (way under 1000ms)
      await useConversationStore.getState().stopPTTRecording();

      const state = useConversationStore.getState();
      expect(state.isPTTActive).toBe(false);
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('selectIsConnected', () => {
    it('returns true when connected', () => {
      const { selectIsConnected } = require('@/stores/conversationStore');
      const state = { connectionState: 'connected' };
      expect(selectIsConnected(state)).toBe(true);
    });

    it('returns false when not connected', () => {
      const { selectIsConnected } = require('@/stores/conversationStore');
      expect(selectIsConnected({ connectionState: 'idle' })).toBe(false);
      expect(selectIsConnected({ connectionState: 'connecting' })).toBe(false);
      expect(selectIsConnected({ connectionState: 'error' })).toBe(false);
    });
  });
});
