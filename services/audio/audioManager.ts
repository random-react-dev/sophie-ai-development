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
        // 1. Set audio session options FIRST (this also re-enables internal management)
        AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'voiceChat',
            iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'],
        });

        // 2. THEN disable internal session management to prevent
        //    react-native-audio-api from overriding our config when
        //    AudioContext is created. Required when using multiple
        //    audio libraries (expo-stream-audio for recording).
        AudioManager.disableSessionManagement();

        isConfigured = true;
        Logger.info(TAG, 'iOS audio session configured (playAndRecord + voiceChat, internal management disabled)');
    } catch (error) {
        Logger.error(TAG, 'Failed to configure audio session', error);
    }
}
