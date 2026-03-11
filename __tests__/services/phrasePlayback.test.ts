describe("GeminiPhrasePlaybackService", () => {
  let geminiPhrasePlayback: typeof import("@/services/gemini/phrasePlayback").geminiPhrasePlayback;
  let mockSpeakingListener:
    | ((isSpeaking: boolean, traceId?: string) => void)
    | null;
  let mockAudioStreamer: {
    initialize: jest.Mock;
    addSpeakingStateListener: jest.Mock;
    prepareForNewResponse: jest.Mock;
    queueAudio: jest.Mock;
    onGenerationComplete: jest.Mock;
    clearQueue: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSpeakingListener = null;
    mockAudioStreamer = {
      initialize: jest.fn(() => Promise.resolve()),
      addSpeakingStateListener: jest.fn((callback) => {
        mockSpeakingListener = callback;
        return () => {
          if (mockSpeakingListener === callback) {
            mockSpeakingListener = null;
          }
        };
      }),
      prepareForNewResponse: jest.fn(),
      queueAudio: jest.fn(),
      onGenerationComplete: jest.fn(),
      clearQueue: jest.fn(),
    };

    jest.mock("@/services/gemini/token", () => ({
      getGeminiSessionToken: jest.fn(() => Promise.resolve("test-token")),
    }));

    jest.mock("@/services/gemini/liveConfig", () => ({
      GEMINI_LIVE_MAX_OUTPUT_TOKENS: 2048,
      GEMINI_LIVE_MODEL_PRIMARY: "models/primary",
      GEMINI_LIVE_MODEL_FALLBACK: "models/fallback",
      GEMINI_LIVE_VOICE_NAME: "Aoede",
    }));

    jest.mock("@/services/audio/streamer", () => ({
      createAudioStreamer: jest.fn(() => mockAudioStreamer),
    }));

    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      onopen: null as ((event: Event) => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onclose: null as ((event: CloseEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };

    // @ts-expect-error - mocked for tests
    global.WebSocket = jest.fn(() => mockWs);
    // @ts-expect-error - static constant for ready state checks
    global.WebSocket.OPEN = 1;

    jest.isolateModules(() => {
      geminiPhrasePlayback =
        require("@/services/gemini/phrasePlayback").geminiPhrasePlayback;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const flushMicrotasks = async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
    }
  };

  it("opens a fresh websocket session and resolves once isolated playback starts", async () => {
    const onStart = jest.fn();
    const onDone = jest.fn();

    const playPromise = geminiPhrasePlayback.playPhrase("Hola", "Spanish", {
      onStart,
      onDone,
    });

    await flushMicrotasks();

    const ws = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

    ws.onopen?.({} as Event);

    expect(ws.send).toHaveBeenCalledTimes(1);
    const setupMsg = JSON.parse(ws.send.mock.calls[0][0]) as {
      setup: { systemInstruction: { parts: Array<{ text: string }> } };
    };
    expect(setupMsg.setup.systemInstruction.parts[0].text).toContain(
      "pronunciation-only mode",
    );

    await ws.onmessage?.({
      data: JSON.stringify({ setupComplete: {} }),
    } as MessageEvent);

    expect(mockAudioStreamer.prepareForNewResponse).toHaveBeenCalledWith(
      expect.stringMatching(/^phrase-/),
      expect.any(Number),
      true,
    );
    expect(ws.send).toHaveBeenCalledTimes(2);

    const speakMsg = JSON.parse(ws.send.mock.calls[1][0]) as {
      clientContent: {
        turns: Array<{ parts: Array<{ text: string }> }>;
      };
    };
    expect(speakMsg.clientContent.turns[0].parts[0].text).toContain('"Hola"');

    await ws.onmessage?.({
      data: JSON.stringify({
        serverContent: {
          modelTurn: {
            parts: [
              {
                inlineData: {
                  mimeType: "audio/pcm",
                  data: "AQID",
                },
              },
            ],
          },
        },
      }),
    } as MessageEvent);

    expect(mockAudioStreamer.queueAudio).toHaveBeenCalledWith("AQID");

    const traceId = mockAudioStreamer.prepareForNewResponse.mock.calls[0][0] as string;
    mockSpeakingListener?.(true, traceId);

    await expect(playPromise).resolves.toBe("started");
    expect(onStart).toHaveBeenCalledTimes(1);

    await ws.onmessage?.({
      data: JSON.stringify({
        serverContent: {
          generationComplete: true,
        },
      }),
    } as MessageEvent);

    expect(mockAudioStreamer.onGenerationComplete).toHaveBeenCalledTimes(1);

    mockSpeakingListener?.(false, traceId);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(ws.close).toHaveBeenCalledWith(1000, "Phrase playback complete");
  });

  it("returns failed when the isolated playback session closes before audio starts", async () => {
    const onError = jest.fn();

    const playPromise = geminiPhrasePlayback.playPhrase("Bonjour", "French", {
      onError,
    });

    await flushMicrotasks();

    const ws = (global.WebSocket as unknown as jest.Mock).mock.results[0].value;

    ws.onopen?.({} as Event);
    ws.onclose?.({
      code: 1011,
      reason: "upstream failed",
    } as CloseEvent);

    await expect(playPromise).resolves.toBe("failed");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "upstream failed",
      }),
    );
  });

  it("returns cancelled without invoking fallback-style errors when stopped before audio starts", async () => {
    const onStop = jest.fn();
    const onError = jest.fn();

    const playPromise = geminiPhrasePlayback.playPhrase("Ciao", "Italian", {
      onStop,
      onError,
    });

    await flushMicrotasks();
    await geminiPhrasePlayback.stop();

    await expect(playPromise).resolves.toBe("cancelled");
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(mockAudioStreamer.clearQueue).toHaveBeenCalledTimes(1);
  });

  it("retries with the fallback live model when the primary model is unsupported", async () => {
    const primaryWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      onopen: null as ((event: Event) => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onclose: null as ((event: CloseEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };
    const fallbackWs = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      onopen: null as ((event: Event) => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onclose: null as ((event: CloseEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };

    (global.WebSocket as unknown as jest.Mock)
      .mockReset()
      .mockImplementationOnce(() => primaryWs)
      .mockImplementationOnce(() => fallbackWs);
    // @ts-expect-error - static constant for ready state checks
    global.WebSocket.OPEN = 1;

    const playPromise = geminiPhrasePlayback.playPhrase("Hola", "Spanish");

    await flushMicrotasks();
    primaryWs.onopen?.({} as Event);

    const primarySetup = JSON.parse(primaryWs.send.mock.calls[0][0]) as {
      setup: { model: string };
    };
    expect(primarySetup.setup.model).toBe("models/primary");

    primaryWs.onclose?.({
      code: 1008,
      reason: "models/primary is not found for API version",
    } as CloseEvent);

    fallbackWs.onopen?.({} as Event);

    const fallbackSetup = JSON.parse(fallbackWs.send.mock.calls[0][0]) as {
      setup: { model: string };
    };
    expect(fallbackSetup.setup.model).toBe("models/fallback");

    await fallbackWs.onmessage?.({
      data: JSON.stringify({ setupComplete: {} }),
    } as MessageEvent);

    const traceId = mockAudioStreamer.prepareForNewResponse.mock.calls[0][0] as string;
    mockSpeakingListener?.(true, traceId);

    await expect(playPromise).resolves.toBe("started");
  });
});
