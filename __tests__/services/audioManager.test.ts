describe('audioManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function freshModule(platform: 'ios' | 'android') {
    jest.resetModules();
    // Set platform AFTER resetModules so it persists for the fresh require
    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', { get: () => platform, configurable: true });
    const { AudioManager } = require('react-native-audio-api');
    const { configureAudioSession } = require('@/services/audio/audioManager');
    return { AudioManager, configureAudioSession };
  }

  describe('configureAudioSession', () => {
    describe('on iOS', () => {
      it('calls AudioManager.setAudioSessionOptions with playAndRecord config', async () => {
        const { AudioManager, configureAudioSession } = freshModule('ios');

        await configureAudioSession();

        expect(AudioManager.setAudioSessionOptions).toHaveBeenCalledWith({
          iosCategory: 'playAndRecord',
          iosMode: 'voiceChat',
          iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'],
        });
      });

      it('calls setAudioSessionActivity(true)', async () => {
        const { AudioManager, configureAudioSession } = freshModule('ios');

        await configureAudioSession();

        expect(AudioManager.setAudioSessionActivity).toHaveBeenCalledWith(true);
      });

      it('only configures once (idempotent)', async () => {
        const { AudioManager, configureAudioSession } = freshModule('ios');

        await configureAudioSession();
        await configureAudioSession();

        expect(AudioManager.setAudioSessionOptions).toHaveBeenCalledTimes(1);
      });
    });

    describe('on Android', () => {
      it('skips all native calls', async () => {
        const { AudioManager, configureAudioSession } = freshModule('android');

        await configureAudioSession();

        expect(AudioManager.setAudioSessionOptions).not.toHaveBeenCalled();
        expect(AudioManager.setAudioSessionActivity).not.toHaveBeenCalled();
      });

      it('still marks as configured (no-op on second call)', async () => {
        const { AudioManager, configureAudioSession } = freshModule('android');

        await configureAudioSession();
        await configureAudioSession();

        expect(AudioManager.setAudioSessionOptions).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('handles setAudioSessionOptions error gracefully', async () => {
        const { AudioManager, configureAudioSession } = freshModule('ios');

        AudioManager.setAudioSessionOptions.mockImplementationOnce(() => {
          throw new Error('Native module error');
        });

        await expect(configureAudioSession()).resolves.not.toThrow();
      });
    });
  });
});
