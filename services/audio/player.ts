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
            this.playNext();
        }
    }

    async playNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const chunk = this.queue.shift();

        if (chunk) {
            try {
                // Convert base64 to something playable or write to file and play (latency!)
                // Optimally we stream this buffer directly to audio output.
                // For MVP without custom native code, we might write to temp file and play.
                // Or use `expo-audio-studio` playback features if available.

                // Placeholder logic:
                // await nativePlayer.playBuffer(chunk, { sampleRate: 24000 });

                // Simulate playback duration for prototype flow
                // console.log("Playing chunk...");
                // await new Promise(r => setTimeout(r, 100)); 

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
