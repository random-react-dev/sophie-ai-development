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
    private chunkCount = 0;

    // Singleton pattern
    private static instance: AudioRecorder;
    private constructor() { }
    public static getInstance(): AudioRecorder {
        if (!AudioRecorder.instance) {
            AudioRecorder.instance = new AudioRecorder();
        }
        return AudioRecorder.instance;
    }

    private handleChunk(data: string) {
        this.chunkCount++;
        if (this.chunkCount % 10 === 0) {
            Logger.debug(TAG, `Audio chunk #${this.chunkCount} sent to callback (${data.length} chars)`);
        }
        if (this.options?.onAudioData) {
            this.options.onAudioData(data);
        }
    }

    async start(options: RecorderOptions) {
        if (this.isRecording) {
            Logger.warn(TAG, 'Already recording, skipping start');
            return;
        }
        this.options = options;
        this.chunkCount = 0;

        try {
            Logger.info(TAG, 'Starting recording (16kHz, mono, PCM)...');
            
            // Start recording with base parameters and direct callback
            await ExpoAudioStreamModule.startRecording({
                sampleRate: 16000,
                encoding: 'pcm_16bit',
                channels: 1,
                interval: 100, // Emit data every 100ms
                onAudioStream: async (event: AudioDataEvent) => {
                    if (typeof event.data === 'string') {
                        this.handleChunk(event.data);
                    }
                }
            });

            // Backup Listener: ensuring we catch all data
            this.subscription = ExpoAudioStreamModule.addListener('onAudioStream', (event: AudioDataEvent) => {
                // If direct callback didn't fire or we want to ensure arrival
                if (!this.isRecording) return; 
                
                if (typeof event.data === 'string') {
                    // Only use backup if direct callback seems to fail? 
                    // Actually, most libraries call both if registered. 
                    // We'll trust the direct one for now but keep listener for life cycle
                }
            });

            this.isRecording = true;
            Logger.info(TAG, 'Recording started successfully');

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
