import { AudioContext, AudioBufferQueueSourceNode } from 'react-native-audio-api';
import { decode } from 'base64-arraybuffer';
import { useConversationStore } from '../../stores/conversationStore';
import { Logger } from '../common/Logger';

const TAG = 'AudioStreamer';
const SAMPLE_RATE = 24000; // Gemini output rate

class AudioStreamer {
    private audioContext: AudioContext | null = null;
    private queueSource: AudioBufferQueueSourceNode | null = null;
    private isPlaying = false;
    private isInterrupted = false;
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
        this.queueSource = this.audioContext.createBufferQueueSource();
        this.queueSource.connect(this.audioContext.destination);
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
     * Schedule speaking state update after queue drains.
     */
    onGenerationComplete(): void {
        if (!this.isPlaying || this.isInterrupted) return;

        Logger.debug(TAG, `Generation complete after ${this.chunkCount} chunks`);

        // Estimate remaining playback time based on queued audio
        // The library handles actual playback timing
        // Set a reasonable timeout to mark speaking as complete
        setTimeout(() => {
            this.finishSpeaking();
        }, 500); // Give some buffer time for queue to drain
    }

    private finishSpeaking(): void {
        if (!this.isPlaying) return;

        Logger.info(TAG, 'Sophie finished speaking');
        this.isPlaying = false;
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
        this.chunkCount = 0;

        // Stop and recreate the queue source to clear pending audio
        if (this.queueSource && this.audioContext) {
            try {
                this.queueSource.stop();
            } catch {
                // Ignore stop errors
            }

            // Recreate queue source for next playback
            this.queueSource = this.audioContext.createBufferQueueSource();
            this.queueSource.connect(this.audioContext.destination);
            this.queueSource.start();
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
        this.chunkCount = 0;
    }
}

export const audioStreamer = AudioStreamer.getInstance();
