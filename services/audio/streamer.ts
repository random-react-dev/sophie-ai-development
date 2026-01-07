import { AudioContext, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import { decode } from 'base64-arraybuffer';
import { useConversationStore } from '../../stores/conversationStore';
import { Logger } from '../common/Logger';

const TAG = 'AudioStreamer';
const SAMPLE_RATE = 24000; // Gemini output rate

interface OnEndedEvent {
    bufferId: string | undefined;
    isLast: boolean | undefined;
}

class AudioStreamer {
    private audioContext: AudioContext | null = null;
    private queueSource: AudioBufferQueueSourceNode | null = null;
    private isPlaying = false;
    private isInterrupted = false;
    private isGenerationComplete = false;
    private chunkCount = 0;

    private static instance: AudioStreamer;
    private constructor() {}
    public static getInstance(): AudioStreamer {
        if (!AudioStreamer.instance) {
            AudioStreamer.instance = new AudioStreamer();
        }
        return AudioStreamer.instance;
    }

    /**
     * Initialize the audio context and queue source.
     * Call this once when conversation starts.
     */
    async initialize(): Promise<void> {
        if (this.audioContext) {
            return; // Already initialized
        }

        Logger.info(TAG, 'Initializing audio context');
        this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        this.setupQueueSource();
    }

    /**
     * Set up the queue source with onEnded callback.
     */
    private setupQueueSource(): void {
        if (!this.audioContext) return;

        this.queueSource = this.audioContext.createBufferQueueSource();
        this.queueSource.connect(this.audioContext.destination);

        // Set up onEnded callback for proper playback completion detection
        this.queueSource.onEnded = (event: OnEndedEvent) => {
            Logger.debug(TAG, `onEnded: bufferId=${event.bufferId}, isLast=${event.isLast}`);

            // isLast=true means the last buffer finished playing
            if (event.isLast && this.isGenerationComplete) {
                this.finishSpeaking();
            }
        };

        this.queueSource.start();
        this.chunkCount = 0;
    }

    /**
     * Queue a PCM audio chunk for gapless playback.
     * @param base64Pcm Base64-encoded 16-bit PCM audio data
     */
    queueAudio(base64Pcm: string): void {
        if (this.isInterrupted || !this.audioContext || !this.queueSource) {
            return;
        }

        try {
            // Decode base64 to ArrayBuffer
            const pcmArrayBuffer = decode(base64Pcm);

            // Convert 16-bit PCM (Int16) to Float32 (required by AudioBuffer)
            const int16Array = new Int16Array(pcmArrayBuffer);
            const float32Array = new Float32Array(int16Array.length);

            for (let i = 0; i < int16Array.length; i++) {
                // Convert from Int16 range [-32768, 32767] to Float32 range [-1, 1]
                float32Array[i] = int16Array[i] / 32768;
            }

            // Create AudioBuffer
            const audioBuffer = this.audioContext.createBuffer(
                1,                    // numberOfChannels (mono)
                float32Array.length,  // length (frames)
                SAMPLE_RATE           // sampleRate
            );

            // Copy data into buffer
            const channelData = audioBuffer.getChannelData(0);
            channelData.set(float32Array);

            // Enqueue for gapless playback
            this.queueSource.enqueueBuffer(audioBuffer);

            // Track state and log
            this.chunkCount++;
            if (this.chunkCount === 1) {
                this.startSpeaking();
            }
            if (this.chunkCount <= 3 || this.chunkCount % 20 === 0) {
                Logger.debug(TAG, `Queued audio chunk #${this.chunkCount} (${float32Array.length} samples)`);
            }
        } catch (error) {
            Logger.error(TAG, 'Error queueing audio', error);
        }
    }

    /**
     * Called when the first audio chunk arrives.
     */
    private startSpeaking(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.isInterrupted = false;
        this.isGenerationComplete = false;

        Logger.info(TAG, 'Sophie started speaking');

        const store = useConversationStore.getState();
        store.setSpeaking(true);

        // Pause audio input while Sophie speaks
        import('../gemini/websocket').then(({ geminiWebSocket }) => {
            geminiWebSocket.pauseAudio();
        });
    }

    /**
     * Called when generation is complete.
     * Sets flag so onEnded callback knows to finish speaking.
     */
    onGenerationComplete(): void {
        if (!this.isPlaying || this.isInterrupted) return;

        Logger.debug(TAG, `Generation complete after ${this.chunkCount} chunks`);
        this.isGenerationComplete = true;

        // The onEnded callback will call finishSpeaking() when last buffer plays
    }

    private finishSpeaking(): void {
        if (!this.isPlaying) return;

        Logger.info(TAG, 'Sophie finished speaking');
        this.isPlaying = false;
        this.isGenerationComplete = false;
        this.chunkCount = 0;

        const store = useConversationStore.getState();
        store.setSpeaking(false);

        // Resume audio input
        import('../gemini/websocket').then(({ geminiWebSocket }) => {
            geminiWebSocket.resumeAudio();
        });
    }

    /**
     * Handle interruption - stop playback immediately.
     */
    handleInterruption(): void {
        Logger.info(TAG, 'Handling interruption');
        this.isInterrupted = true;
        this.isPlaying = false;
        this.isGenerationComplete = false;
        this.chunkCount = 0;

        // Stop and recreate the queue source to clear pending audio
        if (this.queueSource && this.audioContext) {
            try {
                this.queueSource.stop();
            } catch {
                // Ignore stop errors
            }

            // Recreate queue source for next playback
            this.setupQueueSource();
        }

        const store = useConversationStore.getState();
        store.setSpeaking(false);

        // Resume audio input
        import('../gemini/websocket').then(({ geminiWebSocket }) => {
            geminiWebSocket.resumeAudio();
        });
    }

    /**
     * Clear queue and reset state (for disconnect/reset).
     */
    clearQueue(): void {
        Logger.info(TAG, 'Clearing audio queue');
        this.handleInterruption();
        this.isInterrupted = false; // Reset for next session
    }

    /**
     * Clean up resources.
     */
    dispose(): void {
        if (this.queueSource) {
            try {
                this.queueSource.stop();
            } catch {
                // Ignore
            }
            this.queueSource = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isPlaying = false;
        this.isGenerationComplete = false;
        this.chunkCount = 0;
    }
}

export const audioStreamer = AudioStreamer.getInstance();
