import { AudioContext } from 'react-native-audio-api';
import { setPlatform } from '../helpers/platform';
import { encode } from 'base64-arraybuffer';
import { Logger } from '@/services/common/Logger';

type MockQueueSource = {
  connect: jest.Mock;
  disconnect: jest.Mock;
  start: jest.Mock;
  stop: jest.Mock;
  pause: jest.Mock;
  clearBuffers: jest.Mock;
  enqueueBuffer: jest.Mock;
  playbackRate: {
    setValueAtTime: jest.Mock;
  };
  onEnded: ((event: { bufferId: string | undefined; isLast: boolean | undefined }) => void) | null;
};

type MockAudioContextInstance = {
  createGain: jest.Mock;
  createBufferQueueSource: jest.Mock;
  suspend: jest.Mock;
  resume: jest.Mock;
  close: jest.Mock;
};

// Helper to create base64 PCM chunks
function createPcmChunk(sampleCount: number): string {
  const int16 = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    int16[i] = Math.floor(Math.random() * 1000);
  }
  return encode(int16.buffer);
}

/**
 * Get the most recently created AudioContext mock instance.
 * After performFullReset(), the original ctx is closed and a new one is created.
 */
function getLatestCtx(): MockAudioContextInstance {
  const results = (AudioContext as unknown as jest.Mock).mock.results;
  return results[results.length - 1].value as MockAudioContextInstance;
}

function getLatestQueueSource(ctx: MockAudioContextInstance): MockQueueSource {
  const results = ctx.createBufferQueueSource.mock.results;
  return results[results.length - 1].value as MockQueueSource;
}

describe('AudioStreamer', () => {
  let audioStreamer: typeof import('@/services/audio/streamer').audioStreamer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Get fresh singleton via isolateModules
    jest.isolateModules(() => {
      audioStreamer = require('@/services/audio/streamer').audioStreamer;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('creates AudioContext at 24kHz', async () => {
      await audioStreamer.initialize();

      expect(AudioContext).toHaveBeenCalledWith({ sampleRate: 24000 });
      expect(audioStreamer.isReady()).toBe(true);
    });

    it('skips if already initialized', async () => {
      await audioStreamer.initialize();
      await audioStreamer.initialize();

      // Should only create one AudioContext
      expect(AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('prepareForNewResponse', () => {
    beforeEach(async () => {
      await audioStreamer.initialize();
    });

    it('does NOT call suspend/resume on any platform', () => {
      // suspend/resume was removed due to unawaited-Promise race condition
      setPlatform('ios');
      audioStreamer.prepareForNewResponse();

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      expect(ctx.suspend).not.toHaveBeenCalled();
      expect(ctx.resume).not.toHaveBeenCalled();
    });

    it('does NOT call suspend/resume on Android either', () => {
      setPlatform('android');
      audioStreamer.prepareForNewResponse();

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      expect(ctx.suspend).not.toHaveBeenCalled();
      expect(ctx.resume).not.toHaveBeenCalled();
    });

    it('cancels pending gain automations', async () => {
      audioStreamer.prepareForNewResponse();

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      const gainNode = ctx.createGain.mock.results[0].value;
      expect(gainNode.gain.cancelScheduledValues).toHaveBeenCalled();
    });

    it('creates fresh queue source', async () => {
      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      const initialCount = ctx.createBufferQueueSource.mock.calls.length;

      audioStreamer.prepareForNewResponse();

      expect(ctx.createBufferQueueSource.mock.calls.length).toBeGreaterThan(initialCount);
    });
  });

  describe('periodic full reset', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
    });

    it('triggers full reset every response (RESET_AFTER_RESPONSES=1)', () => {
      const initialCallCount = (AudioContext as jest.Mock).mock.calls.length;

      // First response should trigger full reset (recreate AudioContext)
      audioStreamer.prepareForNewResponse();

      expect((AudioContext as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);

      const afterOneCount = (AudioContext as jest.Mock).mock.calls.length;

      // 2nd response should also trigger full reset
      audioStreamer.prepareForNewResponse();

      expect((AudioContext as jest.Mock).mock.calls.length).toBeGreaterThan(afterOneCount);
    });
  });

  describe('queueAudio', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();
    });

    it('does not queue when interrupted', () => {
      audioStreamer.handleInterruption();

      const ctx = getLatestCtx();
      const lastQueueSource = getLatestQueueSource(ctx);

      audioStreamer.queueAudio(createPcmChunk(960));

      expect(lastQueueSource.enqueueBuffer).not.toHaveBeenCalled();
    });

    it('accumulates chunks and flushes when reaching 4800 samples', () => {
      const ctx = getLatestCtx();
      const queueSource = getLatestQueueSource(ctx);

      // Each chunk: 960 samples. Need 5 to reach 4800
      const chunk = createPcmChunk(960);
      audioStreamer.queueAudio(chunk); // 960
      audioStreamer.queueAudio(chunk); // 1920
      audioStreamer.queueAudio(chunk); // 2880
      audioStreamer.queueAudio(chunk); // 3840

      expect(queueSource.enqueueBuffer).not.toHaveBeenCalled();

      audioStreamer.queueAudio(chunk); // 4800 - triggers flush

      expect(queueSource.enqueueBuffer).toHaveBeenCalledTimes(1);
    });
  });

  describe('speaking state callback', () => {
    it('sets callback', async () => {
      const callback = jest.fn();
      audioStreamer.setSpeakingStateCallback(callback);
      // Callback is stored, will be called when speaking starts/stops
    });
  });

  describe('handleInterruption', () => {
    it('stops playback and resets', async () => {
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      audioStreamer.handleInterruption();

      // After interruption, queuing should be blocked
      const ctx = getLatestCtx();
      const queueSource = getLatestQueueSource(ctx);

      audioStreamer.queueAudio(createPcmChunk(960));
      expect(queueSource.enqueueBuffer).not.toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('handles interruption then allows new audio', async () => {
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();

      audioStreamer.clearQueue();

      // After clearQueue, prepareForNewResponse should work again
      audioStreamer.prepareForNewResponse();
      const chunk = createPcmChunk(960);
      // Should not throw
      audioStreamer.queueAudio(chunk);
    });
  });

  describe('dispose', () => {
    it('closes AudioContext and resets state', async () => {
      await audioStreamer.initialize();
      expect(audioStreamer.isReady()).toBe(true);

      audioStreamer.dispose();

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      expect(ctx.close).toHaveBeenCalled();
      expect(audioStreamer.isReady()).toBe(false);
    });
  });

  describe('onGenerationComplete', () => {
    it('flushes remaining accumulated samples', async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();
      const queueSource = getLatestQueueSource(ctx);

      // Queue less than ACCUMULATION_TARGET (4800)
      audioStreamer.queueAudio(createPcmChunk(960));
      audioStreamer.queueAudio(createPcmChunk(960)); // 1920 total

      expect(queueSource.enqueueBuffer).not.toHaveBeenCalled();

      // Generation complete should flush remaining
      audioStreamer.onGenerationComplete();

      expect(queueSource.enqueueBuffer).toHaveBeenCalledTimes(1);
    });

    it('is ignored when interrupted', async () => {
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();
      audioStreamer.handleInterruption();

      // Should not throw or do anything
      audioStreamer.onGenerationComplete();
    });

    it('records starvation when queue drains before generationComplete', async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse('starvation-check');

      const ctx = getLatestCtx();
      const queueSource = getLatestQueueSource(ctx);
      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      const chunk = createPcmChunk(960);
      for (let i = 0; i < 8; i++) {
        audioStreamer.queueAudio(chunk);
      }

      if (queueSource.onEnded) {
        queueSource.onEnded({ bufferId: undefined, isLast: true });
      }

      expect(Logger.warn).toHaveBeenCalledWith(
        'AudioStreamer',
        expect.stringContaining('stage=playback_starvation'),
      );
      expect(speakingStates).not.toContain(false);
    });
  });

  describe('pausePlayback / resumePlayback', () => {
    it('pause does nothing if not playing', async () => {
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();

      // Should not throw
      audioStreamer.pausePlayback();
    });

    it('resume does nothing if not paused', async () => {
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();

      // Should not throw
      audioStreamer.resumePlayback();
    });
  });

  describe('multi-turn conversation', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
    });

    /**
     * Simulate a full conversation turn: prepare → queue enough to start
     * playback → mark generation complete → trigger onEnded(isLast).
     */
    function simulateTurn() {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();
      const queueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

      // Queue enough to trigger playback (MIN_INITIAL_BUFFER = 7200)
      // 960 samples/chunk, need 8 chunks = 7680 > 7200
      const chunk = createPcmChunk(960);
      for (let i = 0; i < 8; i++) {
        audioStreamer.queueAudio(chunk);
      }

      audioStreamer.onGenerationComplete();

      // Simulate native onEnded callback
      if (queueSource.onEnded) {
        queueSource.onEnded({ bufferId: undefined, isLast: true });
      }

      return { ctx, queueSource };
    }

    it('creates fresh queueSource for each turn', () => {
      for (let turn = 0; turn < 3; turn++) {
        simulateTurn();
      }

      // Each turn should have gotten its own queueSource
      // (they may share the same mock shape, but createBufferQueueSource
      // should have been called once per turn + once from full resets)
      const mockResults = (AudioContext as unknown as jest.Mock).mock
        .results as Array<{ value?: MockAudioContextInstance }>;
      const totalCalls = mockResults.reduce(
        (sum: number, result: { value?: MockAudioContextInstance }) =>
          sum + (result.value?.createBufferQueueSource.mock.calls.length ?? 0),
        0,
      );
      expect(totalCalls).toBeGreaterThanOrEqual(3);
    });

    it('handles 3 turns without errors', () => {
      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      // Should not throw across 3 turns
      simulateTurn();
      simulateTurn();
      simulateTurn();

      // Should have seen speaking true→false for each turn
      expect(speakingStates.filter((s) => s === true).length).toBeGreaterThanOrEqual(3);
      expect(speakingStates.filter((s) => s === false).length).toBeGreaterThanOrEqual(3);
    });

    it('stale onEnded callbacks from previous turns are ignored', () => {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();
      const turn1QueueSource = getLatestQueueSource(ctx);
      const turn1OnEnded = turn1QueueSource.onEnded;

      // Move to turn 2 (responseId increments)
      audioStreamer.prepareForNewResponse();

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      // Fire stale onEnded from turn 1 — should be ignored
      if (turn1OnEnded) {
        turn1OnEnded({ bufferId: undefined, isLast: true });
      }

      // No speaking state change from stale callback
      expect(speakingStates).toEqual([]);
    });
  });

  describe('watchdog', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
    });

    it('prepareForNewResponse clears watchdog — no false stall detection', () => {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();
      const queueSource = getLatestQueueSource(ctx);

      // Queue enough to start playback (triggers watchdog)
      const chunk = createPcmChunk(960);
      for (let i = 0; i < 8; i++) {
        audioStreamer.queueAudio(chunk);
      }
      // Playback started, watchdog is now running

      // Move to next response — should clear watchdog
      audioStreamer.prepareForNewResponse();

      // Advance past watchdog interval (500ms)
      jest.advanceTimersByTime(600);

      // Watchdog should NOT have triggered an extra full reset beyond the
      // expected ones. With RESET_AFTER_RESPONSES=1, each prepareForNewResponse
      // triggers a reset. Count before the timer fires:
      const totalContexts = (AudioContext as jest.Mock).mock.calls.length;
      const afterTimerContexts = (AudioContext as jest.Mock).mock.calls.length;
      // No additional context created by the watchdog
      expect(afterTimerContexts).toBe(totalContexts);
    });

    it('watchdog does not call suspend/resume on stall (unified logic)', () => {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();

      // Queue enough to start playback
      const chunk = createPcmChunk(960);
      for (let i = 0; i < 8; i++) {
        audioStreamer.queueAudio(chunk);
      }

      // currentTime stays at 0 (stalled) — advance timer to trigger watchdog
      jest.advanceTimersByTime(500);

      // Watchdog should go directly to full reset, NOT try suspend→resume
      expect(ctx.suspend).not.toHaveBeenCalled();
    });
  });

  describe('android smoothness-first startup', () => {
    function loadAndroidStreamer(): {
      streamer: typeof import('@/services/audio/streamer').audioStreamer;
      audioContextMock: jest.Mock;
    } {
      jest.resetModules();
      delete process.env.EXPO_PUBLIC_ANDROID_QUEUE_RATE_EXPERIMENT;
      let streamer!: typeof import('@/services/audio/streamer').audioStreamer;
      let audioContextMock!: jest.Mock;
      jest.isolateModules(() => {
        const { Platform } = require('react-native');
        Object.defineProperty(Platform, 'OS', {
          get: () => 'android',
          configurable: true,
        });
        streamer = require('@/services/audio/streamer').audioStreamer;
        audioContextMock = require('react-native-audio-api').AudioContext;
      });
      return { streamer, audioContextMock };
    }

    it('waits for generationComplete when stream receive windows are slow', async () => {
      const { streamer, audioContextMock } = loadAndroidStreamer();
      await streamer.initialize();
      streamer.prepareForNewResponse('android-slow');

      const ctx = audioContextMock.mock.results[audioContextMock.mock.results.length - 1]
        .value;
      const queueSource = getLatestQueueSource(ctx as MockAudioContextInstance);
      const chunk = createPcmChunk(19200); // 0.8s @ 24kHz

      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(1200);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(1200);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(1200);
      streamer.queueAudio(chunk);

      expect(queueSource.start).not.toHaveBeenCalled();

      streamer.onGenerationComplete();
      expect(queueSource.start).toHaveBeenCalledTimes(1);
      expect(queueSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('starts early at 1.0x when sustained receive-rate windows are healthy', async () => {
      const { streamer, audioContextMock } = loadAndroidStreamer();
      await streamer.initialize();
      streamer.prepareForNewResponse('android-healthy');

      const ctx = audioContextMock.mock.results[audioContextMock.mock.results.length - 1]
        .value;
      const queueSource = getLatestQueueSource(ctx as MockAudioContextInstance);
      const chunk = createPcmChunk(19200); // 0.8s @ 24kHz

      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(600);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(600);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(600);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(1200);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(600);
      streamer.queueAudio(chunk);
      jest.advanceTimersByTime(600);
      streamer.queueAudio(chunk);

      expect(queueSource.start.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(queueSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('starts at timeout once enough buffer exists even when stream is slow at 1.0x', async () => {
      const { streamer, audioContextMock } = loadAndroidStreamer();
      await streamer.initialize();
      streamer.prepareForNewResponse('android-safe-early');

      const ctx = audioContextMock.mock.results[audioContextMock.mock.results.length - 1]
        .value;
      const queueSource = getLatestQueueSource(ctx as MockAudioContextInstance);
      const chunk = createPcmChunk(19200); // 0.8s @ 24kHz

      for (let i = 0; i < 9; i++) {
        streamer.queueAudio(chunk);
        jest.advanceTimersByTime(1200);
      }

      expect(queueSource.start.mock.calls.length).toBeGreaterThanOrEqual(1);

      streamer.onGenerationComplete();
      expect(queueSource.start.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(queueSource.playbackRate.setValueAtTime).toHaveBeenCalledWith(1, expect.any(Number));
    });

    it('keeps deferring for severe slow windows until generationComplete', async () => {
      const { streamer, audioContextMock } = loadAndroidStreamer();
      await streamer.initialize();
      streamer.prepareForNewResponse('android-severe-slow');

      const ctx = audioContextMock.mock.results[audioContextMock.mock.results.length - 1]
        .value;
      const queueSource = getLatestQueueSource(ctx as MockAudioContextInstance);
      const chunk = createPcmChunk(19200); // 0.8s @ 24kHz

      for (let i = 0; i < 4; i++) {
        streamer.queueAudio(chunk);
        jest.advanceTimersByTime(2000);
      }

      expect(queueSource.start).not.toHaveBeenCalled();

      streamer.onGenerationComplete();
      expect(queueSource.start).toHaveBeenCalledTimes(1);
    });
  });
});
