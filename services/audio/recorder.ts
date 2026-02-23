import { requestRecordingPermissionsAsync } from 'expo-audio';
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
const TARGET_SAMPLE_RATE = 16000;
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
    private isStopping = false;
    private downsampleRatio = 1;

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

            // Request permissions - iOS needs expo-audio to properly show the popup
            let permission: PermissionStatus = 'undetermined';

            if (Platform.OS === 'ios') {
                // Use expo-audio for iOS - it properly triggers the permission popup
                const { status } = await requestRecordingPermissionsAsync();
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

                // On first frame, detect downsample ratio
                if (this.chunkCount === 1) {
                    Logger.info(TAG, `First frame: sampleRate=${frame.sampleRate}, size=${frame.pcmBase64?.length || 0}`);
                    if (frame.sampleRate !== TARGET_SAMPLE_RATE) {
                        this.downsampleRatio = Math.round(frame.sampleRate / TARGET_SAMPLE_RATE);
                        Logger.info(TAG, `Downsampling ${frame.sampleRate}Hz → ${TARGET_SAMPLE_RATE}Hz (ratio: ${this.downsampleRatio}:1)`);
                    }
                } else if (this.chunkCount % 250 === 0) {
                    Logger.debug(TAG, `Recording frame #${this.chunkCount}`);
                }

                // Validate audio data before sending
                if (!frame.pcmBase64 || frame.pcmBase64.length === 0) {
                    Logger.warn(TAG, `Frame #${this.chunkCount}: empty pcmBase64`);
                    return;
                }

                // Downsample if needed (e.g. 48kHz → 16kHz = take every 3rd sample)
                const audioData = this.downsampleRatio > 1
                    ? this.downsample(frame.pcmBase64)
                    : frame.pcmBase64;

                // Send PCM data to callback
                this.options?.onAudioData(audioData);

                // Send volume level
                if (frame.level !== undefined && this.options?.onVolumeChange) {
                    this.options.onVolumeChange(frame.level);
                }
            });

            this.errorSubscription = addErrorListener((event) => {
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
            Logger.info(TAG, `Stopping recording (${this.chunkCount} frames captured)...`);
            this.isStopping = true;
            await stop();
            this.cleanup();
            Logger.info(TAG, 'Recording stopped');
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
        if (this.isStopping && message.includes('0 bytes')) {
            Logger.debug(TAG, 'Expected 0-byte read during stop — ignored');
            return;
        }

        if (!message.includes('0 bytes')) {
            Logger.error(TAG, 'Mic error', message);
            this.consecutiveErrors = 0;
            return;
        }

        this.consecutiveErrors++;
        Logger.warn(TAG, `0-byte error #${this.consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}`);

        if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && !this.isRestarting) {
            Logger.warn(TAG, 'Max consecutive errors reached, attempting restart...');
            this.restartRecording();
        }
    }

    /**
     * Downsample Int16 PCM by taking every Nth sample (simple decimation).
     * Works well for integer ratios like 48kHz→16kHz (3:1).
     */
    private downsample(base64Data: string): string {
        const binaryStr = atob(base64Data);
        const srcLength = binaryStr.length;
        const bytesPerSample = 2; // Int16
        const srcSamples = srcLength / bytesPerSample;
        const dstSamples = Math.floor(srcSamples / this.downsampleRatio);
        const dst = new Uint8Array(dstSamples * bytesPerSample);

        for (let i = 0; i < dstSamples; i++) {
            const srcOffset = i * this.downsampleRatio * bytesPerSample;
            dst[i * 2] = binaryStr.charCodeAt(srcOffset);
            dst[i * 2 + 1] = binaryStr.charCodeAt(srcOffset + 1);
        }

        // Encode back to base64
        let result = '';
        for (let i = 0; i < dst.length; i++) {
            result += String.fromCharCode(dst[i]);
        }
        return btoa(result);
    }

    private cleanup(): void {
        this.frameSubscription?.remove();
        this.errorSubscription?.remove();
        this.frameSubscription = null;
        this.errorSubscription = null;
        this.isRecording = false;
        this.consecutiveErrors = 0;
        this.isRestarting = false;
        this.isStopping = false;
        this.downsampleRatio = 1;
    }
}

export const audioRecorder = AudioRecorder.getInstance();
