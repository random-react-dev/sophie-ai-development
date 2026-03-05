import { AudioContext } from 'react-native-audio-api';
import { setPlatform } from '../helpers/platform';
import { encode } from 'base64-arraybuffer';

type MockBufferSource = {
  start: jest.Mock;
  onEnded: (() => void) | null;
};

type MockAudioContext = {
  createBuffer: jest.Mock;
  createBufferSource: jest.Mock<MockBufferSource, []>;
  createGain: jest.Mock;
  close: jest.Mock;
  resume: jest.Mock;
  suspend: jest.Mock;
  _advanceTime: (seconds: number) => void;
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
function getLatestCtx(): MockAudioContext {
  const results = (AudioContext as jest.Mock).mock.results;
  return results[results.length - 1].value as MockAudioContext;
}

/**
 * Queue enough audio to trigger playback start (MIN_INITIAL_BUFFER = 24000).
 * Uses 4800-sample chunks (0.2s each, matching ACCUMULATION_TARGET) × 5 = 24000.
 */
function queueEnoughToStart(
  audioStreamer: typeof import('@/services/audio/streamer').audioStreamer,
): void {
  const chunk = createPcmChunk(4800);
  for (let i = 0; i < 5; i++) {
    audioStreamer.queueAudio(chunk);
  }
}

function queueChunks(
  audioStreamer: typeof import('@/services/audio/streamer').audioStreamer,
  count: number,
  sampleCount: number = 4800,
): void {
  const chunk = createPcmChunk(sampleCount);
  for (let i = 0; i < count; i++) {
    audioStreamer.queueAudio(chunk);
  }
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

    it('resumes AudioContext if suspended after full reset on iOS', () => {
      setPlatform('ios');

      // Make the next AudioContext constructor return a suspended context
      const suspendedResume = jest.fn(() => Promise.resolve(true));
      (AudioContext as jest.Mock).mockImplementationOnce(() => {
        // Get default mock shape by calling the original implementation
        const results = (AudioContext as jest.Mock).mock.results;
        // Build a suspended context with a trackable resume mock
        const defaultCtx = results[results.length - 1]?.value ?? {};
        return {
          ...defaultCtx,
          state: 'suspended',
          resume: suspendedResume,
          // Re-create factory mocks so they return fresh objects
          createGain: jest.fn(() => ({
            gain: {
              value: 1.0,
              cancelScheduledValues: jest.fn(),
              setValueAtTime: jest.fn(),
              linearRampToValueAtTime: jest.fn(),
            },
            connect: jest.fn(),
            disconnect: jest.fn(),
          })),
          createBuffer: jest.fn((_ch: number, length: number, sr: number) => ({
            duration: length / sr,
            length,
            sampleRate: sr,
            getChannelData: jest.fn(() => ({ set: jest.fn() })),
          })),
          createBufferSource: jest.fn(() => ({
            buffer: null,
            connect: jest.fn(),
            start: jest.fn(),
            onEnded: null,
          })),
          close: jest.fn(),
          currentTime: 0,
          sampleRate: 24000,
          destination: {},
        };
      });

      // First prepareForNewResponse triggers full reset on iOS (RESET_AFTER_RESPONSES_IOS = 1)
      audioStreamer.prepareForNewResponse();

      expect(suspendedResume).toHaveBeenCalledTimes(1);
    });

    it('cancels pending gain automations', async () => {
      audioStreamer.prepareForNewResponse();

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      const gainNode = ctx.createGain.mock.results[0].value;
      expect(gainNode.gain.cancelScheduledValues).toHaveBeenCalled();
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

    it('uses slower full reset cadence on Android', async () => {
      setPlatform('android');
      await audioStreamer.initialize();

      const initialCallCount = (AudioContext as jest.Mock).mock.calls.length;

      audioStreamer.prepareForNewResponse(); // #1
      audioStreamer.prepareForNewResponse(); // #2
      expect((AudioContext as jest.Mock).mock.calls.length).toBe(initialCallCount);

      audioStreamer.prepareForNewResponse(); // #3 -> reset
      expect((AudioContext as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
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

      // After interruption, queueAudio should be a no-op
      audioStreamer.queueAudio(createPcmChunk(960));

      // No createBufferSource calls beyond the priming one
      const ctx = getLatestCtx();
      // Priming creates one buffer source, no additional should be created
      const primeCount = ctx.createBufferSource.mock.calls.length;
      audioStreamer.queueAudio(createPcmChunk(4800));
      expect(ctx.createBufferSource.mock.calls.length).toBe(primeCount);
    });

    it('accumulates chunks and flushes when reaching 4800 samples', () => {
      const ctx = getLatestCtx();

      // Each chunk: 960 samples. Need 5 to reach 4800
      const chunk = createPcmChunk(960);
      audioStreamer.queueAudio(chunk); // 960
      audioStreamer.queueAudio(chunk); // 1920
      audioStreamer.queueAudio(chunk); // 2880
      audioStreamer.queueAudio(chunk); // 3840

      // Should not have created any buffer (besides priming) yet
      const bufferCountBeforeFlush = ctx.createBuffer.mock.calls.length;

      audioStreamer.queueAudio(chunk); // 4800 - triggers flush

      // Should have created exactly one more buffer for the flush
      expect(ctx.createBuffer.mock.calls.length).toBe(bufferCountBeforeFlush + 1);
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
      const bufferCountBefore = ctx.createBuffer.mock.calls.length;
      audioStreamer.queueAudio(createPcmChunk(4800));
      expect(ctx.createBuffer.mock.calls.length).toBe(bufferCountBefore);
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
      const bufferCountBefore = ctx.createBuffer.mock.calls.length;

      // Queue less than ACCUMULATION_TARGET (4800)
      audioStreamer.queueAudio(createPcmChunk(960));
      audioStreamer.queueAudio(createPcmChunk(960)); // 1920 total

      expect(ctx.createBuffer.mock.calls.length).toBe(bufferCountBefore);

      // Generation complete should flush remaining
      audioStreamer.onGenerationComplete();

      expect(ctx.createBuffer.mock.calls.length).toBe(bufferCountBefore + 1);
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

    it('pause mutes gain and resume restores it', async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse();

      // Start playback
      queueEnoughToStart(audioStreamer);

      const ctx = getLatestCtx();
      const gainNode = ctx.createGain.mock.results[ctx.createGain.mock.results.length - 1].value;

      audioStreamer.pausePlayback();
      expect(gainNode.gain.value).toBe(0);

      audioStreamer.resumePlayback();
      expect(gainNode.gain.value).toBe(1.0);
    });
  });

  describe('scheduled playback', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
    });

    it('creates AudioBufferSourceNode for each flush after playback starts', () => {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();

      // Queue enough to start playback (5 chunks of 4800 = 24000)
      queueEnoughToStart(audioStreamer);

      // Count createBufferSource calls after playback started
      const sourceCountAfterStart = ctx.createBufferSource.mock.calls.length;

      // Queue one more chunk after playback started — should schedule immediately
      audioStreamer.queueAudio(createPcmChunk(4800));

      // Should create exactly one more BufferSourceNode
      expect(ctx.createBufferSource.mock.calls.length).toBe(sourceCountAfterStart + 1);
    });

    it('defers playback when using onGenerationComplete policy', () => {
      audioStreamer.prepareForNewResponse({ startPolicy: 'onGenerationComplete' });

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      queueEnoughToStart(audioStreamer);
      expect(speakingStates).toEqual([]);

      audioStreamer.onGenerationComplete();
      expect(speakingStates).toEqual([true]);
    });

    it('starts before generationComplete in adaptive mode', async () => {
      setPlatform('android');
      await audioStreamer.initialize();
      audioStreamer.prepareForNewResponse({ startPolicy: 'adaptive' });

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      // Adaptive target is 1.2s => 6 * 0.2s chunks.
      queueChunks(audioStreamer, 6, 4800);
      expect(speakingStates).toEqual([true]);
    });

    it('source.start() is called with increasing when values', () => {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();

      // Queue enough to start playback
      queueEnoughToStart(audioStreamer);

      // Get all createBufferSource results — filter to only sources that were
      // called with a `when` argument (scheduled sources, not priming)
      const allSources = ctx.createBufferSource.mock.results as Array<{ value: MockBufferSource }>;
      const scheduledSources = allSources.filter(
        (r) => r.value.start.mock.calls.length > 0 && r.value.start.mock.calls[0][0] !== undefined,
      );

      expect(scheduledSources.length).toBeGreaterThan(0);

      // Get the when values from start() calls
      const whenValues = scheduledSources.map(
        (r) => r.value.start.mock.calls[0][0] as number,
      );

      // Values should be non-decreasing (each buffer scheduled after previous)
      for (let i = 1; i < whenValues.length; i++) {
        expect(whenValues[i]).toBeGreaterThanOrEqual(whenValues[i - 1]);
      }
    });

    it('onEnded on last source triggers finishSpeaking', () => {
      audioStreamer.prepareForNewResponse();

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      const ctx = getLatestCtx();

      // Start playback
      queueEnoughToStart(audioStreamer);

      expect(speakingStates).toEqual([true]);

      // Mark generation complete — sets onEnded on last source
      audioStreamer.onGenerationComplete();

      // Get the last created buffer source (skip priming)
      const allSources = ctx.createBufferSource.mock.results;
      const lastSource = allSources[allSources.length - 1].value;

      // onEnded should be set
      expect(lastSource.onEnded).toBeTruthy();

      // Fire onEnded — should trigger finishSpeaking
      lastSource.onEnded();

      expect(speakingStates).toEqual([true, false]);
    });

    it('interruption during playback silences audio via gain disconnect', () => {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();

      // Start playback
      queueEnoughToStart(audioStreamer);

      // Get the gain node that was connected
      const gainResults = ctx.createGain.mock.results;
      const gainBeforeInterrupt = gainResults[gainResults.length - 1].value;

      // Interrupt
      audioStreamer.handleInterruption();

      // Gain node should have been disconnected
      expect(gainBeforeInterrupt.disconnect).toHaveBeenCalled();

      // A new gain node should have been created
      expect(ctx.createGain.mock.results.length).toBeGreaterThan(gainResults.length - 1);
    });

    it('stale onEnded callbacks are ignored (responseId check)', () => {
      audioStreamer.prepareForNewResponse();

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      const ctx = getLatestCtx();

      // Start playback for turn 1
      queueEnoughToStart(audioStreamer);
      audioStreamer.onGenerationComplete();

      // Get the last source with onEnded
      const allSources = ctx.createBufferSource.mock.results;
      const turn1LastSource = allSources[allSources.length - 1].value;
      const turn1OnEnded = turn1LastSource.onEnded;

      expect(speakingStates).toEqual([true]);

      // Move to turn 2 (increments responseId)
      audioStreamer.prepareForNewResponse();

      // Clear speaking states to track only new events
      speakingStates.length = 0;

      // Fire stale onEnded from turn 1 — should be ignored
      if (turn1OnEnded) {
        turn1OnEnded();
      }

      // No speaking state change from stale callback
      expect(speakingStates).toEqual([]);
    });
  });

  describe('multi-turn conversation', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioStreamer.initialize();
    });

    /**
     * Simulate a full conversation turn: prepare → queue enough to start
     * playback → mark generation complete → trigger onEnded.
     */
    function simulateTurn() {
      audioStreamer.prepareForNewResponse();

      const ctx = getLatestCtx();

      // Queue enough to trigger playback (MIN_INITIAL_BUFFER = 24000)
      // 4800 samples/chunk × 5 chunks = 24000
      queueEnoughToStart(audioStreamer);

      audioStreamer.onGenerationComplete();

      // Simulate native onEnded callback on last scheduled source
      const allSources = ctx.createBufferSource.mock.results;
      const lastSource = allSources[allSources.length - 1].value;
      if (lastSource.onEnded) {
        lastSource.onEnded();
      }

      return { ctx };
    }

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

      // Start playback and complete generation for turn 1
      queueEnoughToStart(audioStreamer);
      audioStreamer.onGenerationComplete();

      const allSources = ctx.createBufferSource.mock.results;
      const turn1LastSource = allSources[allSources.length - 1].value;
      const turn1OnEnded = turn1LastSource.onEnded;

      // Move to turn 2 (responseId increments)
      audioStreamer.prepareForNewResponse();

      const speakingStates: boolean[] = [];
      audioStreamer.setSpeakingStateCallback((s) => speakingStates.push(s));

      // Fire stale onEnded from turn 1 — should be ignored
      if (turn1OnEnded) {
        turn1OnEnded();
      }

      // No speaking state change from stale callback
      expect(speakingStates).toEqual([]);
    });
  });
});
