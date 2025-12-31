import { decode } from 'base64-arraybuffer';
import { createAudioPlayer, AudioPlayer as ExpoAudioPlayer } from 'expo-audio';
import { useConversationStore } from "../../stores/conversationStore";
import { Logger } from '../common/Logger';
import { addWavHeader } from './wavHelper';

const TAG = 'AudioPlayer';

// Buffer threshold before starting playback (~170ms at 24kHz 16-bit mono)
const MIN_BUFFER_BYTES = 8000;

class AudioPlayer {
    private isPlaying = false;
    private buffer: string[] = []; // Accumulated PCM chunks
    private sampleRate = 24000; // Gemini 2.5 standard output rate
    private currentPlayer: ExpoAudioPlayer | null = null;
    private isGenerationComplete = false;

    private static instance: AudioPlayer;
    private constructor() { }
    public static getInstance(): AudioPlayer {
        if (!AudioPlayer.instance) {
            AudioPlayer.instance = new AudioPlayer();
        }
        return AudioPlayer.instance;
    }

    /**
     * Queue a PCM audio chunk. Buffers chunks until generation is complete,
     * then plays all at once for smooth audio.
     */
    queueAudio(base64Data: string) {
        this.buffer.push(base64Data);

        // If generation is complete and we're not playing, start playback
        if (this.isGenerationComplete && !this.isPlaying) {
            this.playBuffered();
        }
    }

    /**
     * Called when Gemini signals generation is complete.
     * Triggers playback of all buffered audio.
     */
    onGenerationComplete() {
        Logger.info(TAG, 'Generation complete - playing buffered audio');
        this.isGenerationComplete = true;
        if (!this.isPlaying && this.buffer.length > 0) {
            this.playBuffered();
        }
    }

    /**
     * Play all buffered audio as a single WAV file.
     */
    private async playBuffered() {
        if (this.buffer.length === 0) {
            Logger.debug(TAG, 'Buffer empty, nothing to play');
            return;
        }

        this.isPlaying = true;
        const store = useConversationStore.getState();
        store.setSpeaking(true);

        try {
            // Combine all PCM chunks into one
            const combinedPcm = this.buffer.join('');
            this.buffer = [];
            this.isGenerationComplete = false;

            // Convert combined PCM to WAV
            const wavBase64 = addWavHeader(combinedPcm, this.sampleRate);
            const dataUri = `data:audio/wav;base64,${wavBase64}`;

            Logger.info(TAG, `Playing ${combinedPcm.length} bytes of audio`);

            // Create and play
            const player = createAudioPlayer(dataUri);
            this.currentPlayer = player;
            player.play();

            // Wait for audio to finish
            const pcmBuffer = decode(combinedPcm);
            const durationMs = (pcmBuffer.byteLength / (this.sampleRate * 2)) * 1000;

            await new Promise(r => setTimeout(r, durationMs + 100)); // Add 100ms buffer

            this.currentPlayer = null;
        } catch (error) {
            Logger.error(TAG, 'Error playing audio', error);
        } finally {
            this.isPlaying = false;
            store.setSpeaking(false);
        }
    }

    clearQueue() {
        Logger.info(TAG, 'Clearing audio queue');
        this.buffer = [];
        this.isPlaying = false;
        this.isGenerationComplete = false;
        if (this.currentPlayer) {
            try {
                if ('pause' in this.currentPlayer) {
                    (this.currentPlayer as { pause: () => void }).pause();
                }
            } catch (e) {
                // Ignore pause errors
            }
            this.currentPlayer = null;
        }
        const store = useConversationStore.getState();
        store.setSpeaking(false);
    }
}

export const audioPlayer = AudioPlayer.getInstance();
