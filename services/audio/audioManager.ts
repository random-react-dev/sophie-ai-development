import { AudioManager } from 'react-native-audio-api';
import { Platform } from 'react-native';
import { Logger } from '../common/Logger';

const TAG = 'AudioManagerSetup';

let isConfigured = false;

/**
 * Configure iOS audio session for duplex voice chat.
 * MUST be called BEFORE creating any AudioContext.
 * Enables hardware echo cancellation (AEC), automatic gain control (AGC),
 * and noise suppression for simultaneous recording and playback.
 */
export function configureAudioSession(): void {
    if (isConfigured) {
        Logger.debug(TAG, 'Audio session already configured');
        return;
    }

    if (Platform.OS !== 'ios') {
        Logger.debug(TAG, 'Skipping audio session config (not iOS)');
        isConfigured = true;
        return;
    }

    try {
        AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'voiceChat',
            iosOptions: ['defaultToSpeaker', 'allowBluetooth'],
        });
        isConfigured = true;
        Logger.info(TAG, 'iOS audio session configured for voice chat (AEC enabled)');
    } catch (error) {
        Logger.error(TAG, 'Failed to configure audio session', error);
    }
}
