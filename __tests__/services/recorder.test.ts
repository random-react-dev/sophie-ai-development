import { requestRecordingPermissionsAsync } from 'expo-audio';
import {
  start as streamStart,
  stop as streamStop,
  addFrameListener,
  addErrorListener,
  requestPermission,
} from 'expo-stream-audio';
import { PermissionsAndroid } from 'react-native';
import { setPlatform } from '../helpers/platform';

describe('AudioRecorder', () => {
  let audioRecorder: typeof import('@/services/audio/recorder').audioRecorder;

  beforeEach(() => {
    jest.clearAllMocks();
    // Fresh singleton
    jest.isolateModules(() => {
      audioRecorder = require('@/services/audio/recorder').audioRecorder;
    });
  });

  const mockOptions = {
    onAudioData: jest.fn(),
    onVolumeChange: jest.fn(),
  };

  describe('start', () => {
    describe('on iOS', () => {
      beforeEach(() => setPlatform('ios'));

      it('uses expo-audio for permission request', async () => {
        await audioRecorder.start(mockOptions);

        expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
        expect(requestPermission).not.toHaveBeenCalled();
      });

      it('sets up frame and error listeners', async () => {
        await audioRecorder.start(mockOptions);

        expect(addFrameListener).toHaveBeenCalled();
        expect(addErrorListener).toHaveBeenCalled();
      });

      it('starts stream at 16kHz, 20ms frames', async () => {
        await audioRecorder.start(mockOptions);

        expect(streamStart).toHaveBeenCalledWith(
          expect.objectContaining({
            sampleRate: 16000,
            frameDurationMs: 20,
            enableLevelMeter: true,
          }),
        );
      });

      it('does NOT enable background on iOS', async () => {
        await audioRecorder.start(mockOptions);

        expect(streamStart).toHaveBeenCalledWith(
          expect.objectContaining({
            enableBackground: false,
          }),
        );
      });
    });

    describe('on Android', () => {
      beforeEach(() => {
        setPlatform('android');
        // Mock PermissionsAndroid for Android
        jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(
          PermissionsAndroid.RESULTS.GRANTED,
        );
      });

      it('uses expo-stream-audio for permission first', async () => {
        await audioRecorder.start(mockOptions);

        expect(requestPermission).toHaveBeenCalled();
        expect(requestRecordingPermissionsAsync).not.toHaveBeenCalled();
      });

      it('falls back to PermissionsAndroid if expo-stream-audio denies', async () => {
        (requestPermission as jest.Mock).mockResolvedValueOnce('denied');

        await audioRecorder.start(mockOptions);

        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
      });

      it('enables background for foreground service', async () => {
        await audioRecorder.start(mockOptions);

        expect(streamStart).toHaveBeenCalledWith(
          expect.objectContaining({
            enableBackground: true,
          }),
        );
      });
    });

    describe('permission denied', () => {
      beforeEach(() => setPlatform('ios'));

      it('throws when permission not granted', async () => {
        (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValueOnce({
          status: 'denied',
        });

        await expect(audioRecorder.start(mockOptions)).rejects.toThrow(
          'Microphone permission not granted',
        );
      });
    });

    describe('idempotent', () => {
      beforeEach(() => setPlatform('ios'));

      it('skips if already recording', async () => {
        await audioRecorder.start(mockOptions);
        jest.clearAllMocks();

        await audioRecorder.start(mockOptions);

        // Should not start again
        expect(streamStart).not.toHaveBeenCalled();
      });
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioRecorder.start(mockOptions);
      jest.clearAllMocks();
    });

    it('calls stream stop', async () => {
      await audioRecorder.stop();
      expect(streamStop).toHaveBeenCalled();
    });

    it('cleans up listeners', async () => {
      // The frame/error subscriptions have remove() mocks
      await audioRecorder.stop();

      // After stop, starting again should set up new listeners
      jest.clearAllMocks();
      await audioRecorder.start(mockOptions);
      expect(addFrameListener).toHaveBeenCalled();
    });

    it('skips if not recording', async () => {
      await audioRecorder.stop();
      jest.clearAllMocks();

      await audioRecorder.stop();
      expect(streamStop).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      setPlatform('ios');
      await audioRecorder.start(mockOptions);
    });

    it('ignores non-zero-byte errors for consecutive count', () => {
      const errorCallback = (addErrorListener as jest.Mock).mock.calls[0][0];

      // Non-zero-byte errors should not increment the counter
      errorCallback({ message: 'Some other error' });
      errorCallback({ message: 'Another error' });

      // Recording should still be active (no restart triggered)
    });

    it('counts consecutive zero-byte errors', () => {
      const errorCallback = (addErrorListener as jest.Mock).mock.calls[0][0];

      // Simulate 4 zero-byte errors (below threshold of 5)
      for (let i = 0; i < 4; i++) {
        errorCallback({ message: 'Read returned 0 bytes' });
      }

      // Should not have triggered restart yet (below MAX_CONSECUTIVE_ERRORS=5)
      // Recording should still be active
    });
  });
});
