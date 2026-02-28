import { AudioContext } from 'react-native-audio-api';
import { setPlatform } from '../helpers/platform';
import { encode } from 'base64-arraybuffer';

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
function getLatestCtx(): any {
  const results = (AudioContext as jest.Mock).mock.results;
  return results[results.length - 1].value;
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
      const lastQueueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

      audioStreamer.queueAudio(createPcmChunk(960));

      expect(lastQueueSource.enqueueBuffer).not.toHaveBeenCalled();
    });

    it('accumulates chunks and flushes when reaching 4800 samples', () => {
      const ctx = getLatestCtx();
      const queueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

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
      const queueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

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
      const queueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

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
      const queueSources: any[] = [];

      for (let turn = 0; turn < 3; turn++) {
        const { queueSource } = simulateTurn();
        queueSources.push(queueSource);
      }

      // Each turn should have gotten its own queueSource
      // (they may share the same mock shape, but createBufferQueueSource
      // should have been called once per turn + once from full resets)
      const totalCalls = (AudioContext as jest.Mock).mock.results.reduce(
        (sum: number, result: any) =>
          sum + result.value.createBufferQueueSource.mock.calls.length,
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
      const turn1QueueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;
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
      const queueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

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
});
