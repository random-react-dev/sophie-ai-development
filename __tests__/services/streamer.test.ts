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

    describe('on iOS', () => {
      beforeEach(() => setPlatform('ios'));

      it('performs suspend/resume cycle', () => {
        audioStreamer.prepareForNewResponse();

        const ctx = (AudioContext as jest.Mock).mock.results[0].value;
        expect(ctx.suspend).toHaveBeenCalled();
        expect(ctx.resume).toHaveBeenCalled();
      });
    });

    describe('on Android', () => {
      beforeEach(() => setPlatform('android'));

      it('skips suspend/resume (would destabilize Oboe)', () => {
        audioStreamer.prepareForNewResponse();

        const ctx = (AudioContext as jest.Mock).mock.results[0].value;
        expect(ctx.suspend).not.toHaveBeenCalled();
        expect(ctx.resume).not.toHaveBeenCalled();
      });
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

    it('triggers full reset every 3 responses', () => {
      const initialCallCount = (AudioContext as jest.Mock).mock.calls.length;

      // First 2 responses: no full reset
      audioStreamer.prepareForNewResponse(); // response 1
      audioStreamer.prepareForNewResponse(); // response 2

      const afterTwoCount = (AudioContext as jest.Mock).mock.calls.length;
      expect(afterTwoCount).toBe(initialCallCount); // No new context created

      // 3rd response should trigger full reset (recreate AudioContext)
      audioStreamer.prepareForNewResponse();

      expect((AudioContext as jest.Mock).mock.calls.length).toBeGreaterThan(afterTwoCount);
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

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
      const lastQueueSource = ctx.createBufferQueueSource.mock.results[
        ctx.createBufferQueueSource.mock.results.length - 1
      ].value;

      audioStreamer.queueAudio(createPcmChunk(960));

      expect(lastQueueSource.enqueueBuffer).not.toHaveBeenCalled();
    });

    it('accumulates chunks and flushes when reaching 4800 samples', () => {
      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
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
      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
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

      const ctx = (AudioContext as jest.Mock).mock.results[0].value;
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
});
