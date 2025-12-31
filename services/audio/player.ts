import { createAudioPlayer, AudioPlayer as ExpoAudioPlayer } from 'expo-audio';
import { useConversationStore } from "../../stores/conversationStore";
import { Logger } from '../common/Logger';
import { addWavHeader } from './wavHelper';
import { decode } from 'base64-arraybuffer';

const TAG = 'AudioPlayer';

class AudioPlayer {
    private isPlaying = false;
    private queue: string[] = []; // Queue of base64 chunks
    private sampleRate = 24000; // Gemini 2.5 standard output rate
    private currentPlayer: ExpoAudioPlayer | null = null;

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
            Logger.info(TAG, 'Queue empty, stopping playback');
            this.isPlaying = false;
            const store = useConversationStore.getState();
            store.setSpeaking(false);
            return;
        }

        this.isPlaying = true;
        const pcmBase64 = this.queue.shift();

        if (pcmBase64) {
            try {
                // Convert PCM to playable WAV
                const wavBase64 = addWavHeader(pcmBase64, this.sampleRate);
                const dataUri = `data:audio/wav;base64,${wavBase64}`;

                Logger.debug(TAG, `Playing chunk of size ${pcmBase64.length}`);

                // Create and play
                const player = createAudioPlayer(dataUri);
                this.currentPlayer = player;
                
                player.play();

                // Wait for the chunk to finish
                // PCM 24kHz 16-bit mono = 48000 bytes/sec
                const pcmBuffer = decode(pcmBase64);
                const durationMs = (pcmBuffer.byteLength / 48000) * 1000;
                
                await new Promise(r => setTimeout(r, durationMs));

                // Cleanup player
                this.currentPlayer = null;
                
                this.playNext();
            } catch (error) {
                Logger.error(TAG, 'Error playing audio chunk', error);
                this.playNext();
            }
        }
    }

    clearQueue() {
        Logger.info(TAG, 'Clearing audio queue');
        this.queue = [];
        this.isPlaying = false;
        if (this.currentPlayer) {
            // Attempt to stop current playback
            try {
                // @ts-ignore - check if stop exists in this version
                if (typeof this.currentPlayer.pause === 'function') {
                    this.currentPlayer.pause();
                }
            } catch (e) {
                // Ignore
            }
            this.currentPlayer = null;
        }
        const store = useConversationStore.getState();
        store.setSpeaking(false);
    }
}

export const audioPlayer = AudioPlayer.getInstance();
