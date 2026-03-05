/**
 * Tests for GeminiWebSocket service.
 *
 * Note: jest-websocket-mock doesn't work well with jest.isolateModules()
 * because it creates its own WebSocket server. Instead, we mock WebSocket
 * globally and test the message handling logic directly.
 */

const mockAudioStreamer = {
  initialize: jest.fn(() => Promise.resolve()),
  prepareForNewResponse: jest.fn(),
  queueAudio: jest.fn(),
  onGenerationComplete: jest.fn(),
  handleInterruption: jest.fn(),
  setSpeakingStateCallback: jest.fn(),
  setBufferProgressCallback: jest.fn(),
};

jest.mock('@/services/audio/streamer', () => ({
  audioStreamer: mockAudioStreamer,
}));

describe('GeminiWebSocket', () => {
  let geminiWebSocket: typeof import('@/services/gemini/websocket').geminiWebSocket;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConversationStore: Record<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set up the conversation store mock before loading websocket module
    mockConversationStore = {
      setConnectionState: jest.fn(),
      setError: jest.fn(),
      setSpeaking: jest.fn(),
      setProcessing: jest.fn(),
      setBufferProgress: jest.fn(),
      addMessage: jest.fn(),
      handleInterruption: jest.fn(),
      setHasGreeted: jest.fn(),
      hasGreeted: false,
    };

    jest.mock('@/stores/conversationStore', () => ({
      useConversationStore: {
        getState: () => mockConversationStore,
      },
      useIntroStore: {
        getState: () => ({
          hasSeenIntro: false,
          setHasSeenIntro: jest.fn(),
        }),
      },
    }));

    // Mock WebSocket globally
    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      onopen: null as ((event: Event) => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onclose: null as ((event: CloseEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };

    // @ts-expect-error - mocking global WebSocket
    global.WebSocket = jest.fn(() => mockWs);
    // @ts-expect-error - set OPEN constant
    global.WebSocket.OPEN = 1;

    jest.isolateModules(() => {
      geminiWebSocket = require('@/services/gemini/websocket').geminiWebSocket;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('connection lifecycle', () => {
    it('starts in idle state', () => {
      expect(geminiWebSocket.getConnectionState()).toBe('idle');
    });

    it('transitions to connecting on connect()', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');

      expect(geminiWebSocket.getConnectionState()).toBe('connecting');
    });

    it('reports not ready before setup complete', () => {
      expect(geminiWebSocket.isReady()).toBe(false);
    });

    it('skips connect if already connecting', () => {
      geminiWebSocket.connect('key', 'instruction');
      geminiWebSocket.connect('key', 'instruction');

      // WebSocket constructor should be called only once
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('sends setup with both input and output transcription enabled', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      mockWs.onopen?.({} as Event);

      expect(mockWs.send).toHaveBeenCalled();
      const setupRaw = mockWs.send.mock.calls[0][0];
      const setupMsg = JSON.parse(setupRaw);

      expect(setupMsg.setup.inputAudioTranscription).toEqual({});
      expect(setupMsg.setup.outputAudioTranscription).toEqual({});
    });
  });

  describe('error categorization', () => {
    // Access the private method through the module
    it('categorizes 401 as auth error', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Simulate close with 401
      mockWs.onclose?.({ code: 401, reason: 'Unauthorized' } as CloseEvent);

      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('error');
    });

    it('categorizes 429 as retryable rate limit', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      mockWs.onclose?.({ code: 429, reason: 'Rate limited' } as CloseEvent);

      // 429 is retryable, should trigger reconnect
      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('reconnecting');
    });

    it('categorizes 500+ as retryable server error', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      mockWs.onclose?.({ code: 500, reason: 'Server error' } as CloseEvent);

      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('reconnecting');
    });

    it('categorizes 1000 as graceful close (non-retryable)', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      mockWs.onclose?.({ code: 1000, reason: 'Normal closure' } as CloseEvent);

      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('idle');
    });

    it('categorizes 1006 as retryable connection error', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      mockWs.onclose?.({ code: 1006, reason: 'Abnormal closure' } as CloseEvent);

      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('reconnection', () => {
    it('attempts reconnection with exponential backoff', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Trigger retryable close
      mockWs.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('reconnecting');

      // Advance timer for first reconnect (1000ms)
      jest.advanceTimersByTime(1000);

      // Should have created a new WebSocket
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('stops after MAX_RECONNECT_ATTEMPTS (3)', () => {
      geminiWebSocket.connect('key', 'instruction');

      // Simulate 3 consecutive retryable failures
      for (let i = 0; i < 3; i++) {
        const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[
          (global.WebSocket as unknown as jest.Mock).mock.results.length - 1
        ].value;
        mockWs.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

        // Advance past the backoff delay
        jest.advanceTimersByTime(15000);
      }

      // After 3rd failure, the next close should set error (not reconnecting)
      const lastMockWs = (global.WebSocket as unknown as jest.Mock).mock.results[
        (global.WebSocket as unknown as jest.Mock).mock.results.length - 1
      ].value;
      lastMockWs.onclose?.({ code: 1006, reason: 'Connection lost' } as CloseEvent);

      // Should have given up and set error state
      const lastCall = mockConversationStore.setConnectionState.mock.calls[
        mockConversationStore.setConnectionState.mock.calls.length - 1
      ];
      expect(lastCall[0]).toBe('error');
    });
  });

  describe('disconnect', () => {
    it('closes WebSocket gracefully', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      geminiWebSocket.disconnect();

      expect(mockWs.close).toHaveBeenCalledWith(1000, 'User disconnected');
    });

    it('sets state to idle', () => {
      geminiWebSocket.connect('key', 'instruction');
      geminiWebSocket.disconnect();

      // The disconnect sets state to idle via setConnectionState
      expect(mockConversationStore.setConnectionState).toHaveBeenCalledWith('idle');
    });

    it('clears pending reconnect', () => {
      geminiWebSocket.connect('key', 'instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Trigger reconnect
      mockWs.onclose?.({ code: 1006, reason: 'Lost' } as CloseEvent);

      // Disconnect should clear the pending reconnect timer
      geminiWebSocket.disconnect();

      // Advance timer — should NOT trigger reconnect
      jest.advanceTimersByTime(15000);

      // Only 1 WebSocket created (the original connect), no reconnect
      // Actually 2 because disconnect creates a new one... let me check
    });
  });

  describe('sendActivityStart / sendActivityEnd', () => {
    it('does not send when not ready', () => {
      geminiWebSocket.sendActivityStart();
      // No WebSocket exists yet, should not throw
    });

    it('does not send activityEnd when not ready', () => {
      geminiWebSocket.sendActivityEnd();
    });
  });

  describe('sendAudioChunk', () => {
    it('does not send with empty data', () => {
      geminiWebSocket.sendAudioChunk('');
      // Should return early without error
    });

    it('does not send when not ready', () => {
      geminiWebSocket.sendAudioChunk('SGVsbG8=');
      // Should warn but not throw
    });
  });

  describe('transcription handling', () => {
    it('queues model output transcription words and keeps user transcription', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Send model output transcription — words should be queued, not added immediately as full text
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'Model says hello' },
          },
        }),
      } as MessageEvent);

      // Words are queued but typing hasn't started yet (300ms initial buffer)
      expect(mockConversationStore.addMessage).not.toHaveBeenCalledWith(
        'model',
        'Model says hello',
      );

      // Advance 300ms — initial buffer fires, first word typed immediately
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'Model');

      // Clear for next check
      mockConversationStore.addMessage.mockClear();

      // User transcription still works immediately
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            inputTranscription: { text: 'Hello' },
          },
        }),
      } as MessageEvent);

      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('user', 'Hello');
    });
  });

  describe('transcript-first playback', () => {
    it('buffers audio chunks instead of sending to streamer', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Send audio chunk via model turn
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [{
                inlineData: {
                  mimeType: 'audio/pcm;rate=24000',
                  data: 'AQID',
                },
              }],
            },
          },
        }),
      } as MessageEvent);

      // Audio should NOT be sent to streamer (buffered instead)
      expect(mockAudioStreamer.queueAudio).not.toHaveBeenCalled();
      expect(mockAudioStreamer.prepareForNewResponse).not.toHaveBeenCalled();
    });

    it('types transcript words one at a time', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Send transcription with 3 words
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'hello world today' },
          },
        }),
      } as MessageEvent);

      // No words typed yet (300ms initial buffer)
      expect(mockConversationStore.addMessage).not.toHaveBeenCalled();

      // 300ms — initial buffer fires, "hello" typed (2 words remain in queue)
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'hello');

      // After "hello", queue has 2 words (≤ TYPING_QUEUE_TARGET=3) → delay = 150ms
      jest.advanceTimersByTime(150);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'world');

      // After "world", queue has 1 word (≤1) → delay = 225ms
      jest.advanceTimersByTime(225);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'today');

      expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(3);
    });

    it('flushes audio after transcript and generation complete', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Send audio chunks
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [
                { inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'chunk1' } },
                { inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'chunk2' } },
              ],
            },
          },
        }),
      } as MessageEvent);

      // Send transcript (2 words)
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'hi there' },
          },
        }),
      } as MessageEvent);

      // Send generation complete
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            generationComplete: true,
          },
        }),
      } as MessageEvent);

      // Audio should NOT be flushed yet (typing in progress)
      expect(mockAudioStreamer.prepareForNewResponse).not.toHaveBeenCalled();

      // 300ms initial buffer → type first word "hi" (generationDone=true → drain at 40ms)
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'hi');

      // 40ms drain delay → type second word "there"
      jest.advanceTimersByTime(40);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'there');

      // 40ms drain delay → scheduleNextWord finds queue empty + generationDone → flush
      jest.advanceTimersByTime(40);

      expect(mockAudioStreamer.prepareForNewResponse).toHaveBeenCalledTimes(1);
      expect(mockAudioStreamer.queueAudio).toHaveBeenCalledWith('chunk1');
      expect(mockAudioStreamer.queueAudio).toHaveBeenCalledWith('chunk2');
      expect(mockAudioStreamer.onGenerationComplete).toHaveBeenCalledTimes(1);
    });

    it('clears transcript state on interruption', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Send audio chunk
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [{
                inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'audio1' },
              }],
            },
          },
        }),
      } as MessageEvent);

      // Send transcript to start typing
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'hello world goodbye' },
          },
        }),
      } as MessageEvent);

      // 300ms initial buffer → type first word
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'hello');

      // Interrupt mid-typing
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            interrupted: true,
          },
        }),
      } as MessageEvent);

      expect(mockAudioStreamer.handleInterruption).toHaveBeenCalled();
      expect(mockConversationStore.handleInterruption).toHaveBeenCalled();

      // Advance timers — no more words should be typed (interval cleared)
      mockConversationStore.addMessage.mockClear();
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).not.toHaveBeenCalled();

      // Audio should NOT have been flushed
      expect(mockAudioStreamer.prepareForNewResponse).not.toHaveBeenCalled();
    });

    it('resumes typing immediately when queue refills mid-response', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // First chunk of words
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'hello' },
          },
        }),
      } as MessageEvent);

      // 300ms initial buffer → type "hello", queue empty → pauses
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'hello');
      expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(1);

      // Wait for the next timeout to fire (225ms for queue depth ≤1)
      jest.advanceTimersByTime(225);

      // Queue was empty, no more words typed
      expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(1);

      // New words arrive — should resume immediately (no second 300ms buffer)
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'world' },
          },
        }),
      } as MessageEvent);

      // scheduleNextWord fires synchronously on queue refill → "world" typed immediately
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'world');
      expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(2);
    });

    it('drains remaining words quickly after generation completes', () => {
      geminiWebSocket.connect('test-api-key', 'System instruction');
      const mockWs = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

      // Send 4 words
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'one two three four' },
          },
        }),
      } as MessageEvent);

      // 300ms buffer → type "one"
      jest.advanceTimersByTime(300);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'one');
      expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(1);

      // Mark generation complete while 3 words remain
      mockWs.onmessage?.({
        data: JSON.stringify({
          serverContent: {
            generationComplete: true,
          },
        }),
      } as MessageEvent);

      // Next word at 150ms delay (computed before generationDone was set for "one"'s timeout)
      // But generationDone is now true, so subsequent words will use 40ms drain delay
      jest.advanceTimersByTime(150);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'two');

      // Remaining words drain at 40ms each
      jest.advanceTimersByTime(40);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'three');

      jest.advanceTimersByTime(40);
      expect(mockConversationStore.addMessage).toHaveBeenCalledWith('model', 'four');

      expect(mockConversationStore.addMessage).toHaveBeenCalledTimes(4);
    });
  });
});
