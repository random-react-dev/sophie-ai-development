import { decode } from 'base64-arraybuffer';
import { AudioBufferQueueSourceNode, AudioContext } from 'react-native-audio-api';
import { Logger } from '../common/Logger';

const TAG = 'AudioStreamer';
const SAMPLE_RATE = 24000; // Gemini output rate

// Accumulate chunks into 0.5s buffers before sending to native
const ACCUMULATION_TARGET = 12000; // 0.5s of audio at 24kHz
const MIN_INITIAL_BUFFER = 12000; // 0.5s of audio before starting playback

type SpeakingStateCallback = (isSpeaking: boolean) => void;

class AudioStreamer {
    private audioContext: AudioContext | null = null;
    private queueSource: AudioBufferQueueSourceNode | null = null;
    private isPlaying = false;
    private isInterrupted = false;
    private isGenerationComplete = false;
    private hasStartedPlayback = false;
    private chunkCount = 0;
    private speakingStateCallback: SpeakingStateCallback | null = null;
    private finishTimeout: ReturnType<typeof setTimeout> | null = null;
    private responseId = 0;

    // Buffer accumulation
    private accumulatedSamples: Float32Array[] = [];
    private accumulatedLength = 0;
    private totalQueuedSamples = 0;

    private static instance: AudioStreamer;
    private constructor() { }

    public static getInstance(): AudioStreamer {
        if (!AudioStreamer.instance) {
            AudioStreamer.instance = new AudioStreamer();
        }
        return AudioStreamer.instance;
    }

    setSpeakingStateCallback(callback: SpeakingStateCallback): void {
        this.speakingStateCallback = callback;
    }

    isReady(): boolean {
        return this.audioContext !== null;
    }

    async initialize(): Promise<void> {
        if (this.audioContext) return;

        const { configureAudioSession } = await import('./audioManager');
        configureAudioSession();

        Logger.info(TAG, 'Initializing audio context');
        this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    }

    prepareForNewResponse(): void {
        // If currently playing, stop and reset first
        // This handles the case where user starts a new turn before previous audio finishes
        if (this.isPlaying) {
            Logger.info(TAG, 'Stopping current playback for new response');
            this.stopCurrentPlayback();
        }

        // Cancel any pending finish timeout
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }

        // Increment response ID to invalidate stale callbacks
        this.responseId++;

        // CRITICAL: Create a FRESH queueSource for each response
        this.createFreshQueueSource();

        this.isInterrupted = false;
        this.isGenerationComplete = false;
        this.hasStartedPlayback = false;
        this.chunkCount = 0;
        this.accumulatedSamples = [];
        this.accumulatedLength = 0;
        this.totalQueuedSamples = 0;

        Logger.info(TAG, `Prepared for response #${this.responseId}`);
    }

    private stopCurrentPlayback(): void {
        if (this.queueSource) {
            try {
                this.queueSource.clearBuffers();
                this.queueSource.stop();
                this.queueSource.disconnect();
            } catch { }
            this.queueSource = null;
        }

        const wasPlaying = this.isPlaying;
        this.isPlaying = false;

        if (wasPlaying) {
            this.speakingStateCallback?.(false);
        }
    }

    private createFreshQueueSource(): void {
        if (!this.audioContext) return;

        // Cleanup old queue source if exists
        if (this.queueSource) {
            try {
                this.queueSource.disconnect();
            } catch { }
            this.queueSource = null;
        }

        // Create fresh queue source
        this.queueSource = this.audioContext.createBufferQueueSource();
        this.queueSource.connect(this.audioContext.destination);
    }

    /**
     * Queue a PCM audio chunk. Chunks are accumulated into larger buffers
     * (0.5s) before sending to native layer to reduce bridge traffic.
     */
    queueAudio(base64Pcm: string): void {
        if (this.isInterrupted || !this.audioContext || !this.queueSource) return;

        // Resume AudioContext if suspended
        if (this.audioContext.state === 'suspended') {
            Logger.info(TAG, 'Resuming suspended AudioContext');
            this.audioContext.resume();
        }

        try {
            // Decode base64 to Float32
            const pcmArrayBuffer = decode(base64Pcm);
            const int16Array = new Int16Array(pcmArrayBuffer);
            const float32Array = new Float32Array(int16Array.length);

            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768;
            }

            this.chunkCount++;

            // Accumulate samples
            this.accumulatedSamples.push(float32Array);
            this.accumulatedLength += float32Array.length;

            // If we have enough accumulated, flush to native
            if (this.accumulatedLength >= ACCUMULATION_TARGET) {
                this.flushAccumulatedBuffer();
            }

            // Start playback once we have enough initial buffer
            if (!this.hasStartedPlayback && this.totalQueuedSamples >= MIN_INITIAL_BUFFER) {
                this.startSpeaking();
            }
        } catch (error) {
            Logger.error(TAG, 'Error queueing audio', error);
        }
    }

    /**
     * Flush accumulated samples into a single AudioBuffer and queue it.
     */
    private flushAccumulatedBuffer(): void {
        if (!this.audioContext || !this.queueSource || this.accumulatedLength === 0) return;

        // Merge all accumulated samples
        const merged = new Float32Array(this.accumulatedLength);
        let offset = 0;
        for (const chunk of this.accumulatedSamples) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }

        // Create AudioBuffer and queue
        const audioBuffer = this.audioContext.createBuffer(1, this.accumulatedLength, SAMPLE_RATE);
        audioBuffer.getChannelData(0).set(merged);
        this.queueSource.enqueueBuffer(audioBuffer);

        // Track total queued
        this.totalQueuedSamples += this.accumulatedLength;

        // Clear accumulator
        this.accumulatedSamples = [];
        this.accumulatedLength = 0;
    }

    private startSpeaking(): void {
        if (this.isPlaying || !this.queueSource) return;

        // Start the queue source playback
        Logger.info(TAG, `Starting playback (${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(1)}s buffered)`);
        this.queueSource.start();

        this.isPlaying = true;
        this.hasStartedPlayback = true;
        Logger.info(TAG, 'Sophie started speaking');
        this.speakingStateCallback?.(true);
    }

    onGenerationComplete(): void {
        if (this.isInterrupted) return;

        this.isGenerationComplete = true;

        // Flush any remaining samples
        if (this.accumulatedLength > 0) {
            this.flushAccumulatedBuffer();
        }

        Logger.info(TAG, `Generation complete (${this.chunkCount} chunks, ${(this.totalQueuedSamples / SAMPLE_RATE).toFixed(1)}s total)`);

        // Start playback if we haven't yet (short responses)
        if (!this.hasStartedPlayback && this.totalQueuedSamples > 0) {
            this.startSpeaking();
        }

        // Capture response ID for staleness check
        const currentResponseId = this.responseId;

        // Schedule finish based on audio duration
        const durationMs = (this.totalQueuedSamples / SAMPLE_RATE) * 1000;
        Logger.info(TAG, `Playback will finish in ~${(durationMs / 1000).toFixed(1)}s`);

        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
        }

        this.finishTimeout = setTimeout(() => {
            if (this.responseId === currentResponseId && this.isPlaying && !this.isInterrupted) {
                this.finishSpeaking();
            }
        }, durationMs + 1000);
    }

    private finishSpeaking(): void {
        if (!this.isPlaying) return;

        Logger.info(TAG, 'Sophie finished speaking');

        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }

        this.resetState();
        this.speakingStateCallback?.(false);
    }

    private resetState(): void {
        this.isPlaying = false;
        this.isGenerationComplete = false;
        this.hasStartedPlayback = false;
        this.chunkCount = 0;
        this.accumulatedSamples = [];
        this.accumulatedLength = 0;
        this.totalQueuedSamples = 0;
    }

    handleInterruption(): void {
        Logger.info(TAG, 'Handling interruption');
        this.isInterrupted = true;
        this.responseId++;

        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }

        this.stopCurrentPlayback();
        this.resetState();
    }

    clearQueue(): void {
        Logger.info(TAG, 'Clearing audio queue');
        this.handleInterruption();
        this.isInterrupted = false;
    }

    dispose(): void {
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }

        this.stopCurrentPlayback();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.resetState();
    }
}

export const audioStreamer = AudioStreamer.getInstance();
