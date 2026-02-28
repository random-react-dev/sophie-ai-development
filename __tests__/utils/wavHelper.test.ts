import { addWavHeader } from '@/services/audio/wavHelper';
import { decode } from 'base64-arraybuffer';

describe('wavHelper', () => {
  describe('addWavHeader', () => {
    it('creates a valid 44-byte WAV header', () => {
      // Create simple PCM data: 4 bytes (2 Int16 samples)
      const pcmData = new Uint8Array([0x00, 0x01, 0x00, 0x02]);
      const pcmBase64 = btoa(String.fromCharCode(...pcmData));

      const wavBase64 = addWavHeader(pcmBase64, 24000);
      const wavBuffer = decode(wavBase64);
      const view = new DataView(wavBuffer);

      // Total length should be 44 (header) + 4 (pcm data)
      expect(wavBuffer.byteLength).toBe(48);

      // RIFF header
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');

      // File size (36 + data length)
      expect(view.getUint32(4, true)).toBe(36 + 4);

      // WAVE format
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');

      // fmt chunk
      expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');

      // fmt chunk size (16 for PCM)
      expect(view.getUint32(16, true)).toBe(16);

      // Audio format (1 = PCM)
      expect(view.getUint16(20, true)).toBe(1);

      // Channels (1 = mono)
      expect(view.getUint16(22, true)).toBe(1);
    });

    it('sets the correct sample rate', () => {
      const pcmBase64 = btoa('\x00\x00');
      const wavBase64 = addWavHeader(pcmBase64, 24000);
      const view = new DataView(decode(wavBase64));

      // Sample rate at offset 24
      expect(view.getUint32(24, true)).toBe(24000);

      // Byte rate = sample rate * block align (2 bytes per sample * 1 channel)
      expect(view.getUint32(28, true)).toBe(24000 * 2);
    });

    it('sets correct sample rate for 16kHz', () => {
      const pcmBase64 = btoa('\x00\x00');
      const wavBase64 = addWavHeader(pcmBase64, 16000);
      const view = new DataView(decode(wavBase64));

      expect(view.getUint32(24, true)).toBe(16000);
      expect(view.getUint32(28, true)).toBe(16000 * 2);
    });

    it('sets correct block align and bits per sample', () => {
      const pcmBase64 = btoa('\x00\x00');
      const wavBase64 = addWavHeader(pcmBase64, 24000);
      const view = new DataView(decode(wavBase64));

      // Block align (2 bytes = 1 channel * 2 bytes per sample)
      expect(view.getUint16(32, true)).toBe(2);

      // Bits per sample (16)
      expect(view.getUint16(34, true)).toBe(16);
    });

    it('sets correct data chunk header', () => {
      const pcmData = new Uint8Array([0, 0, 0, 0, 0, 0]);
      const pcmBase64 = btoa(String.fromCharCode(...pcmData));
      const wavBase64 = addWavHeader(pcmBase64, 24000);
      const view = new DataView(decode(wavBase64));

      // data chunk identifier
      expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data');

      // data chunk length
      expect(view.getUint32(40, true)).toBe(6);
    });

    it('preserves PCM data after header', () => {
      const pcmData = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
      const pcmBase64 = btoa(String.fromCharCode(...pcmData));
      const wavBase64 = addWavHeader(pcmBase64, 24000);
      const wavBuffer = new Uint8Array(decode(wavBase64));

      // PCM data starts at offset 44
      expect(wavBuffer[44]).toBe(0xAA);
      expect(wavBuffer[45]).toBe(0xBB);
      expect(wavBuffer[46]).toBe(0xCC);
      expect(wavBuffer[47]).toBe(0xDD);
    });
  });
});
