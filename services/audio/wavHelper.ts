import { decode, encode } from 'base64-arraybuffer';

/**
 * Adds a 44-byte WAV header to a base64 encoded PCM string.
 * This makes it playable by standard audio players like expo-audio.
 */
export function addWavHeader(pcmBase64: string, sampleRate: number): string {
    const pcmBuffer = decode(pcmBase64);
    const pcmLength = pcmBuffer.byteLength;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + pcmLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, pcmLength, true);

    const wavBuffer = new Uint8Array(44 + pcmLength);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(new Uint8Array(pcmBuffer), 44);

    return encode(wavBuffer.buffer);
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
