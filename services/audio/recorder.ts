import { ExpoAudioStreamModule } from '@siteed/expo-audio-studio';

export interface RecorderOptions {
    onAudioData: (base64Data: string) => void;
    onVolumeChange?: (rms: number) => void;
}

class AudioRecorder {
    private isRecording = false;
    private options: RecorderOptions | null = null;
    private subscription: any;
    private bufferSize = 4096; // Adjust based on chunk size requirements (e.g. 100ms)

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
        if (this.isRecording) return;
        this.options = options;

        try {
            // Configure for 16kHz, 16-bit, Mono PCM (Gemini requirement)
            await ExpoAudioStreamModule.startRecording({
                sampleRate: 16000,
                encoding: 'pcm_16bit', // Ensure this string matches library expectations
                channels: 1,
                interval: 100, // Emit data every 100ms
            });

            this.isRecording = true;

            // Listen for audio data events
            this.subscription = ExpoAudioStreamModule.addListener('onAudioStream', (event: any) => {
                if (this.options?.onAudioData && event.data) {
                    this.options.onAudioData(event.data);
                }
            });

        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }

    async stop() {
        if (!this.isRecording) return;

        try {
            await ExpoAudioStreamModule.stopRecording();
            this.isRecording = false;

            if (this.subscription) {
                this.subscription.remove();
                this.subscription = null;
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            throw error;
        }
    }
}

export const audioRecorder = AudioRecorder.getInstance();
