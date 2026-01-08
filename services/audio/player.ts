import { decode } from 'base64-arraybuffer';
import { createAudioPlayer, AudioPlayer as ExpoAudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useConversationStore } from "../../stores/conversationStore";
import { Logger } from '../common/Logger';
import { addWavHeader } from './wavHelper';

const TAG = 'AudioPlayer';

// Number of chunks to buffer before starting playback (~120ms at 40ms/chunk)
const MIN_CHUNKS_BEFORE_PLAY = 3;
const SAMPLE_RATE = 24000; // Gemini 2.5 standard output rate

class AudioPlayer {
    private buffer: string[] = []; // Queue of PCM chunks
    private isPlaying = false;
    private isInterrupted = false;
    private currentPlayer: ExpoAudioPlayer | null = null;
    private playbackLoopRunning = false;

    private static instance: AudioPlayer;
    private constructor() { }
    public static getInstance(): AudioPlayer {
        if (!AudioPlayer.instance) {
            AudioPlayer.instance = new AudioPlayer();
        }
        return AudioPlayer.instance;
    }

    /**
     * Queue a PCM audio chunk for streaming playback.
     * Starts playback automatically once enough chunks are buffered.
     */
    queueAudio(base64Data: string) {
        if (this.isInterrupted) {
            // Don't queue if we've been interrupted
            return;
        }

        this.buffer.push(base64Data);

        // Start playback loop if we have enough chunks and not already playing
        if (this.buffer.length >= MIN_CHUNKS_BEFORE_PLAY && !this.playbackLoopRunning) {
            this.startPlaybackLoop();
        }
    }

    /**
     * Called when Gemini signals generation is complete.
     * Ensures any remaining buffered audio gets played.
     */
    onGenerationComplete() {
        Logger.debug(TAG, `Generation complete - ${this.buffer.length} chunks remaining`);
        // If there are remaining chunks and playback isn't running, play them
        if (this.buffer.length > 0 && !this.playbackLoopRunning && !this.isInterrupted) {
            this.startPlaybackLoop();
        }
    }

    /**
     * Streaming playback loop - plays chunks as they come in.
     */
    private async startPlaybackLoop() {
        if (this.playbackLoopRunning) {
            return;
        }

        this.playbackLoopRunning = true;
        this.isPlaying = true;
        this.isInterrupted = false;

        const store = useConversationStore.getState();
        store.setSpeaking(true);

        // Audio continues streaming - hardware AEC handles echo cancellation
        // Gemini's automatic VAD handles turn detection and interruptions

        Logger.info(TAG, 'Starting streaming playback loop');

        try {
            while (this.buffer.length > 0 && !this.isInterrupted) {
                // Take the next chunk from the queue
                const chunk = this.buffer.shift();
                if (!chunk) break;

                await this.playChunk(chunk);
            }
        } catch (error) {
            Logger.error(TAG, 'Error in playback loop', error);
        } finally {
            this.playbackLoopRunning = false;
            this.isPlaying = false;
            this.currentPlayer = null;

            // Only set speaking to false if not interrupted (interruption handler sets it)
            if (!this.isInterrupted) {
                store.setSpeaking(false);
            }

            // Audio streaming continues automatically - no resume needed

            Logger.debug(TAG, 'Playback loop ended');
        }
    }

    /**
     * Play a single audio chunk.
     */
    private async playChunk(base64Pcm: string): Promise<void> {
        if (this.isInterrupted) {
            return;
        }

        let tempFile: File | null = null;

        try {
            // Convert PCM to WAV
            const wavBase64 = addWavHeader(base64Pcm, SAMPLE_RATE);

            // Write to temp file (iOS requires file path, not data URI)
            const filename = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`;
            tempFile = new File(Paths.cache, filename);

            // Decode base64 to bytes and write
            const wavBytes = decode(wavBase64);
            tempFile.write(new Uint8Array(wavBytes));

            // Create player from file URI
            const player = createAudioPlayer(tempFile.uri);
            this.currentPlayer = player;
            player.play();

            // Calculate duration and wait
            const pcmBuffer = decode(base64Pcm);
            const durationMs = (pcmBuffer.byteLength / (SAMPLE_RATE * 2)) * 1000;

            // Wait for playback to complete (with small buffer for timing)
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    resolve();
                }, durationMs + 10);

                // If interrupted, resolve immediately
                if (this.isInterrupted) {
                    clearTimeout(timeout);
                    resolve();
                }
            });

            this.currentPlayer = null;
        } catch (error) {
            Logger.error(TAG, 'Error playing chunk', error);
        } finally {
            // Clean up temp file
            if (tempFile && tempFile.exists) {
                try {
                    tempFile.delete();
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Handle interruption - immediately stop playback and clear queue.
     */
    handleInterruption() {
        Logger.info(TAG, 'Handling interruption - stopping playback');
        this.isInterrupted = true;
        this.buffer = [];

        // Stop current player
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

        this.isPlaying = false;
        const store = useConversationStore.getState();
        store.setSpeaking(false);

        // Audio streaming continues automatically - VAD detects user speech
    }

    /**
     * Clear the audio queue (for reset/disconnect).
     */
    clearQueue() {
        Logger.info(TAG, 'Clearing audio queue');
        this.handleInterruption();
        this.isInterrupted = false; // Reset for next session
    }
}

export const audioPlayer = AudioPlayer.getInstance();
