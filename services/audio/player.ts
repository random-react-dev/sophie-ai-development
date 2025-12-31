import { useConversationStore } from "../../stores/conversationStore";

// Note: for raw PCM 24kHz playback (Gemini 2.5), we need a specialized approach.
// expo-audio/av usually plays files.
// Gemini 2.5 output is natively 24kHz, 16-bit PCM.
class AudioPlayer {
    private isPlaying = false;
    private queue: string[] = []; // Queue of base64 chunks
    private sampleRate = 24000; // Gemini 2.5 standard output rate

    private static instance: AudioPlayer;
    private constructor() { }
    public static getInstance(): AudioPlayer {
        if (!AudioPlayer.instance) {
            AudioPlayer.instance = new AudioPlayer();
        }
        return AudioPlayer.instance;
    }

    queueAudio(base64Data: string) {
        this.queue.push(base64Data);
        if (!this.isPlaying) {
            const store = useConversationStore.getState();
            store.setSpeaking(true);
            this.playNext();
        }
    }

    async playNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            // Notify store that speaking is finished
            const store = useConversationStore.getState();
            store.setSpeaking(false);
            return;
        }

        this.isPlaying = true;
        const chunkBase64 = this.queue.shift();

        if (chunkBase64) {
            try {
                // Calculate approximate duration of the PCM chunk
                // 24kHz, 16-bit mono = 48,000 bytes per second
                const binaryString = atob(chunkBase64);
                const bytes = binaryString.length;
                const durationMs = (bytes / 48000) * 1000;

                // For prototype, we just wait for the duration to simulate playback
                // This ensures isSpeaking stays true for the right amount of time
                await new Promise(r => setTimeout(r, durationMs));

                this.playNext();
            } catch (error) {
                console.error("Error playing chunk:", error);
                this.playNext();
            }
        }
    }

    clearQueue() {
        this.queue = [];
        this.isPlaying = false;
        // logic to stop current playback immediately
    }
}

export const audioPlayer = AudioPlayer.getInstance();
