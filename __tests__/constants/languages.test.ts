import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
  APP_LANGUAGES,
  APP_LANG_CODES,
} from '@/constants/languages';

describe('languages constants', () => {
  describe('getLanguageByCode', () => {
    it('finds English by code "en"', () => {
      const lang = getLanguageByCode('en');
      expect(lang).toBeDefined();
      expect(lang!.name).toBe('English');
      expect(lang!.code).toBe('en');
    });

    it('finds Hindi by code "hi"', () => {
      const lang = getLanguageByCode('hi');
      expect(lang).toBeDefined();
      expect(lang!.name).toBe('Hindi');
    });

    it('finds Spanish by code "es"', () => {
      const lang = getLanguageByCode('es');
      expect(lang).toBeDefined();
      expect(lang!.name).toBe('Spanish');
    });

    it('returns undefined for invalid code', () => {
      expect(getLanguageByCode('xx')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getLanguageByCode('')).toBeUndefined();
    });
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('has no duplicate codes', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('every language has required fields', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(lang.code).toBeTruthy();
        expect(lang.name).toBeTruthy();
        expect(lang.nativeName).toBeTruthy();
        expect(lang.flag).toBeTruthy();
        expect(lang.countryCode).toBeTruthy();
      }
    });

    it('has at least 40 languages', () => {
      expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('DEFAULT_SOURCE_LANG', () => {
    it('is English', () => {
      expect(DEFAULT_SOURCE_LANG.code).toBe('en');
      expect(DEFAULT_SOURCE_LANG.name).toBe('English');
    });
  });

  describe('DEFAULT_TARGET_LANG', () => {
    it('is Hindi', () => {
      expect(DEFAULT_TARGET_LANG.code).toBe('hi');
      expect(DEFAULT_TARGET_LANG.name).toBe('Hindi');
    });
  });

  describe('APP_LANGUAGES', () => {
    it('contains only languages from APP_LANG_CODES', () => {
      for (const lang of APP_LANGUAGES) {
        expect(APP_LANG_CODES).toContain(lang.code);
      }
    });

    it('is ordered according to APP_LANG_CODES', () => {
      const appCodes = APP_LANGUAGES.map((l) => l.code);
      for (let i = 0; i < appCodes.length - 1; i++) {
        const idxA = APP_LANG_CODES.indexOf(appCodes[i]);
        const idxB = APP_LANG_CODES.indexOf(appCodes[i + 1]);
        expect(idxA).toBeLessThan(idxB);
      }
    });
  });
});
