import { Audio } from 'expo-av';
import {
    addErrorListener,
    addFrameListener,
    requestPermission,
    start,
    stop,
    type PermissionStatus,
    type Subscription,
} from 'expo-stream-audio';
import { PermissionsAndroid, Platform } from 'react-native';

import { Logger } from '../common/Logger';

const TAG = 'AudioRecorder';
const MAX_CONSECUTIVE_ERRORS = 5;
const RESTART_DELAY_MS = 200;

export interface RecorderOptions {
    onAudioData: (base64Data: string) => void;
    onVolumeChange?: (rms: number) => void;
}

class AudioRecorder {
    private isRecording = false;
    private options: RecorderOptions | null = null;
    private frameSubscription: Subscription | null = null;
    private errorSubscription: Subscription | null = null;
    private chunkCount = 0;
    private consecutiveErrors = 0;
    private isRestarting = false;

    // Singleton pattern
    private static instance: AudioRecorder;
    private constructor() { }
    public static getInstance(): AudioRecorder {
        if (!AudioRecorder.instance) {
            AudioRecorder.instance = new AudioRecorder();
        }
        return AudioRecorder.instance;
    }

    async start(options: RecorderOptions): Promise<void> {
        if (this.isRecording) {
            Logger.warn(TAG, 'Already recording, skipping start');
            return;
        }
        this.options = options;
        this.chunkCount = 0;
        this.consecutiveErrors = 0;

        try {
            Logger.info(TAG, 'Starting recording (16kHz, mono, PCM)...');

            // Request permissions - iOS needs expo-av to properly show the popup
            let permission: PermissionStatus = 'undetermined';

            if (Platform.OS === 'ios') {
                // Use expo-av for iOS - it properly triggers the permission popup
                const { status } = await Audio.requestPermissionsAsync();
                permission = status as PermissionStatus;
                Logger.info(TAG, `iOS permission status: ${status}`);
            } else {
                // For Android, use expo-stream-audio first, then fallback to PermissionsAndroid
                permission = await requestPermission();

                if (permission !== 'granted') {
                    const result = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
                    );
                    if (result === PermissionsAndroid.RESULTS.GRANTED) {
                        permission = 'granted';
                    }
                }
            }

            if (permission !== 'granted') {
                throw new Error('Microphone permission not granted');
            }

            // Set up event listeners before starting
            this.frameSubscription = addFrameListener((frame) => {
                // Reset error counter on successful frame
                this.consecutiveErrors = 0;
                this.chunkCount++;

                // On first frame, log sample rate to verify it matches what Gemini expects
                if (this.chunkCount === 1) {
                    Logger.info(TAG, `First frame: sampleRate=${frame.sampleRate}, size=${frame.pcmBase64?.length || 0}`);
                    if (frame.sampleRate !== 16000) {
                        Logger.warn(TAG, `Sample rate mismatch! Got ${frame.sampleRate}, expected 16000`);
                    }
                } else if (this.chunkCount % 50 === 0) {
                    Logger.debug(TAG, `Audio frame #${this.chunkCount}`);
                }

                // Validate audio data before sending
                if (!frame.pcmBase64 || frame.pcmBase64.length === 0) {
                    Logger.warn(TAG, `Frame #${this.chunkCount}: empty pcmBase64`);
                    return;
                }

                // Send PCM data to callback
                this.options?.onAudioData(frame.pcmBase64);

                // Send volume level
                if (frame.level !== undefined && this.options?.onVolumeChange) {
                    this.options.onVolumeChange(frame.level);
                }
            });

            this.errorSubscription = addErrorListener((event) => {
                Logger.error(TAG, 'Microphone error', event.message);
                this.handleRecordingError(event.message);
            });

            // Start streaming (16kHz, 20ms frames = ~50 frames/second)
            // enableBackground starts foreground service on Android for reliable APK recording
            await start({
                sampleRate: 16000,
                frameDurationMs: 20,
                enableLevelMeter: true,
                enableBackground: Platform.OS === 'android',
            });

            this.isRecording = true;
            Logger.info(TAG, 'Recording started successfully');

        } catch (error) {
            Logger.error(TAG, 'Failed to start recording', error);
            this.cleanup();
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isRecording) {
            Logger.warn(TAG, 'Not recording, skipping stop');
            return;
        }

        try {
            Logger.info(TAG, 'Stopping recording...');
            await stop();
            this.cleanup();
            Logger.info(TAG, 'Recording stopped successfully');
        } catch (error) {
            Logger.error(TAG, 'Failed to stop recording', error);
            this.cleanup();
            throw error;
        }
    }

    private async restartRecording(): Promise<void> {
        if (this.isRestarting || !this.options) return;

        this.isRestarting = true;
        const savedOptions = this.options;

        try {
            Logger.info(TAG, 'Restarting audio recording...');
            await this.stop();
            await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));
            await this.start(savedOptions);
            Logger.info(TAG, 'Audio recording restarted successfully');
        } catch (error) {
            Logger.error(TAG, 'Failed to restart recording', error);
        } finally {
            this.isRestarting = false;
            this.consecutiveErrors = 0;
        }
    }

    private handleRecordingError(message: string): void {
        if (!message.includes('0 bytes')) {
            this.consecutiveErrors = 0;
            return;
        }

        this.consecutiveErrors++;
        Logger.warn(TAG, `Consecutive 0-byte errors: ${this.consecutiveErrors}`);

        if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && !this.isRestarting) {
            Logger.warn(TAG, 'Max consecutive errors reached, attempting restart...');
            this.restartRecording();
        }
    }

    private cleanup(): void {
        this.frameSubscription?.remove();
        this.errorSubscription?.remove();
        this.frameSubscription = null;
        this.errorSubscription = null;
        this.isRecording = false;
        this.consecutiveErrors = 0;
        this.isRestarting = false;
    }
}

export const audioRecorder = AudioRecorder.getInstance();
