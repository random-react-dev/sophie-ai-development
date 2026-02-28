import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { setPlatform } from '../helpers/platform';

// Must import after mocks are set up by setup.ts
import { speakWord, stopSpeaking, isSpeaking } from '@/services/audio/tts';

describe('TTS service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('speakWord', () => {
    describe('on iOS', () => {
      beforeEach(() => setPlatform('ios'));

      it('uses full BCP 47 code for Spanish ("es-ES")', async () => {
        await speakWord('Hola', 'Spanish');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Hola',
          expect.objectContaining({
            language: 'es-ES',
          }),
        );
      });

      it('uses full BCP 47 code for Hindi ("hi-IN")', async () => {
        await speakWord('नमस्ते', 'Hindi');

        expect(Speech.speak).toHaveBeenCalledWith(
          'नमस्ते',
          expect.objectContaining({
            language: 'hi-IN',
          }),
        );
      });

      it('uses full BCP 47 code for French ("fr-FR")', async () => {
        await speakWord('Bonjour', 'French');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Bonjour',
          expect.objectContaining({
            language: 'fr-FR',
          }),
        );
      });

      it('resets audio session to playback mode', async () => {
        await speakWord('Hello', 'English');

        expect(Audio.setAudioModeAsync).toHaveBeenCalledWith({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
        });
      });

      it('stops current speech before starting new', async () => {
        await speakWord('Hello', 'English');

        expect(Speech.stop).toHaveBeenCalled();
        expect(Speech.speak).toHaveBeenCalled();

        // Verify stop was called before speak by checking invocation order
        const stopOrder = (Speech.stop as jest.Mock).mock.invocationCallOrder[0];
        const speakOrder = (Speech.speak as jest.Mock).mock.invocationCallOrder[0];
        expect(stopOrder).toBeLessThan(speakOrder);
      });
    });

    describe('on Android', () => {
      beforeEach(() => setPlatform('android'));

      it('strips BCP 47 to bare code for Spanish ("es" not "es-ES")', async () => {
        await speakWord('Hola', 'Spanish');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Hola',
          expect.objectContaining({
            language: 'es',
          }),
        );
      });

      it('strips BCP 47 to bare code for Hindi', async () => {
        await speakWord('नमस्ते', 'Hindi');

        expect(Speech.speak).toHaveBeenCalledWith(
          'नमस्ते',
          expect.objectContaining({
            language: 'hi',
          }),
        );
      });

      it('does NOT call Audio.setAudioModeAsync', async () => {
        await speakWord('Hello', 'English');

        expect(Audio.setAudioModeAsync).not.toHaveBeenCalled();
      });

      it('strips accent code to bare language on Android', async () => {
        await speakWord('Hola', 'Spanish', undefined, 1.0, 'es-MX');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Hola',
          expect.objectContaining({
            language: 'es',
          }),
        );
      });
    });

    describe('accent handling', () => {
      beforeEach(() => setPlatform('ios'));

      it('uses accent code when it matches base language', async () => {
        await speakWord('Hello', 'English', undefined, 1.0, 'en-AU');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Hello',
          expect.objectContaining({
            language: 'en-AU',
          }),
        );
      });

      it('ignores accent code when it does not match base language', async () => {
        // Spanish accent on French vocab — should use French
        await speakWord('Bonjour', 'French', undefined, 1.0, 'es-ES');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Bonjour',
          expect.objectContaining({
            language: 'fr-FR', // iOS BCP 47 for French
          }),
        );
      });
    });

    describe('rate parameter', () => {
      beforeEach(() => setPlatform('ios'));

      it('uses default rate of 1.0', async () => {
        await speakWord('Hello', 'English');

        expect(Speech.speak).toHaveBeenCalledWith(
          'Hello',
          expect.objectContaining({ rate: 1.0 }),
        );
      });

      it('passes custom rate', async () => {
        await speakWord('Hello', 'English', undefined, 0.5);

        expect(Speech.speak).toHaveBeenCalledWith(
          'Hello',
          expect.objectContaining({ rate: 0.5 }),
        );
      });
    });

    describe('edge cases', () => {
      beforeEach(() => setPlatform('ios'));

      it('returns early for empty text', async () => {
        await speakWord('  ', 'English');
        expect(Speech.speak).not.toHaveBeenCalled();
      });

      it('handles null languageName', async () => {
        await speakWord('Hello', null);
        // Should fall back to 'en' and then BCP 47 'en-US' on iOS
        expect(Speech.speak).toHaveBeenCalledWith(
          'Hello',
          expect.objectContaining({
            language: 'en-US',
          }),
        );
      });

      it('handles undefined languageName', async () => {
        await speakWord('Hello', undefined);
        expect(Speech.speak).toHaveBeenCalledWith(
          'Hello',
          expect.objectContaining({
            language: 'en-US',
          }),
        );
      });

      it('calls onStart callback', async () => {
        const onStart = jest.fn();
        await speakWord('Hello', 'English', { onStart });

        const callArgs = (Speech.speak as jest.Mock).mock.calls[0][1];
        callArgs.onStart();
        expect(onStart).toHaveBeenCalled();
      });

      it('calls onDone callback', async () => {
        const onDone = jest.fn();
        await speakWord('Hello', 'English', { onDone });

        const callArgs = (Speech.speak as jest.Mock).mock.calls[0][1];
        callArgs.onDone();
        expect(onDone).toHaveBeenCalled();
      });
    });
  });

  describe('stopSpeaking', () => {
    it('calls Speech.stop', async () => {
      await stopSpeaking();
      expect(Speech.stop).toHaveBeenCalled();
    });
  });

  describe('isSpeaking', () => {
    it('returns result from Speech.isSpeakingAsync', async () => {
      (Speech.isSpeakingAsync as jest.Mock).mockResolvedValueOnce(true);
      expect(await isSpeaking()).toBe(true);
    });
  });
});
