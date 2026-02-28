import { pcmToBase64, base64ToPcm, calculateRMS } from '@/services/audio/utils';

describe('audio utils', () => {
  describe('pcmToBase64 / base64ToPcm roundtrip', () => {
    it('roundtrips a simple buffer', () => {
      const original = new ArrayBuffer(8);
      const view = new Uint8Array(original);
      view.set([1, 2, 3, 4, 5, 6, 7, 8]);

      const base64 = pcmToBase64(original);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);

      const decoded = base64ToPcm(base64);
      expect(new Uint8Array(decoded)).toEqual(view);
    });

    it('roundtrips an empty buffer', () => {
      const original = new ArrayBuffer(0);
      const base64 = pcmToBase64(original);
      const decoded = base64ToPcm(base64);
      expect(decoded.byteLength).toBe(0);
    });

    it('roundtrips Int16 PCM data', () => {
      const int16 = new Int16Array([100, -200, 300, -400, 32767, -32768]);
      const base64 = pcmToBase64(int16.buffer);
      const decoded = base64ToPcm(base64);
      const result = new Int16Array(decoded);
      expect(result).toEqual(int16);
    });
  });

  describe('calculateRMS', () => {
    it('returns 0 for silence', () => {
      const silence = new Int16Array([0, 0, 0, 0]);
      expect(calculateRMS(silence)).toBe(0);
    });

    it('returns correct RMS for known values', () => {
      // RMS of [3, 4] = sqrt((9 + 16) / 2) = sqrt(12.5) ≈ 3.536
      const samples = new Int16Array([3, 4]);
      const rms = calculateRMS(samples);
      expect(rms).toBeCloseTo(Math.sqrt(12.5), 5);
    });

    it('returns correct RMS for constant signal', () => {
      // RMS of constant value K = K
      const samples = new Int16Array([100, 100, 100, 100]);
      expect(calculateRMS(samples)).toBe(100);
    });

    it('accepts ArrayBuffer input', () => {
      const int16 = new Int16Array([3, 4]);
      const rms = calculateRMS(int16.buffer);
      expect(rms).toBeCloseTo(Math.sqrt(12.5), 5);
    });

    it('handles negative values correctly', () => {
      // RMS should be the same regardless of sign
      const positive = new Int16Array([100, 100]);
      const negative = new Int16Array([-100, -100]);
      expect(calculateRMS(positive)).toBe(calculateRMS(negative));
    });

    it('returns max amplitude for full-scale signal', () => {
      const fullScale = new Int16Array([32767]);
      expect(calculateRMS(fullScale)).toBe(32767);
    });
  });
});
