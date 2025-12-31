import { ExpoAudioStreamModule, AudioDataEvent } from '@siteed/expo-audio-studio';
import { Logger } from '../common/Logger';

const TAG = 'AudioRecorder';

export interface RecorderOptions {
    onAudioData: (base64Data: string) => void;
    onVolumeChange?: (rms: number) => void;
}

class AudioRecorder {
    private isRecording = false;
    private options: RecorderOptions | null = null;
    private subscription: any = null;

    // Singleton pattern
    private static instance: AudioRecorder;
    private constructor() { }
    public static getInstance(): AudioRecorder {
        if (!AudioRecorder.instance) {
            AudioRecorder.instance = new AudioRecorder();
        }
        return AudioRecorder.instance;
    }

    async start(options: RecorderOptions) {
        if (this.isRecording) {
            Logger.warn(TAG, 'Already recording, skipping start');
            return;
        }
        this.options = options;

        try {
            Logger.info(TAG, 'Starting recording (16kHz, mono, PCM)...');
            
            // Start recording with base parameters
            await ExpoAudioStreamModule.startRecording({
                sampleRate: 16000,
                encoding: 'pcm_16bit',
                channels: 1,
                interval: 100, // Emit data every 100ms
            });

            // Listen for audio data events using the more reliable addListener pattern
            this.subscription = ExpoAudioStreamModule.addListener('onAudioStream', (event: AudioDataEvent) => {
                if (this.options?.onAudioData && typeof event.data === 'string') {
                    Logger.debug(TAG, `Chunk received from native: ${event.data.length} chars`);
                    this.options.onAudioData(event.data);
                }
            });

            this.isRecording = true;
            Logger.info(TAG, 'Recording started successfully with listener');

        } catch (error) {
            Logger.error(TAG, 'Failed to start recording', error);
            throw error;
        }
    }

    async stop() {
        if (!this.isRecording) {
            Logger.warn(TAG, 'Not recording, skipping stop');
            return;
        }

        try {
            Logger.info(TAG, 'Stopping recording...');
            
            if (this.subscription) {
                this.subscription.remove();
                this.subscription = null;
            }

            await ExpoAudioStreamModule.stopRecording();
            this.isRecording = false;
            Logger.info(TAG, 'Recording stopped successfully');
        } catch (error) {
            Logger.error(TAG, 'Failed to stop recording', error);
            throw error;
        }
    }
}

export const audioRecorder = AudioRecorder.getInstance();
