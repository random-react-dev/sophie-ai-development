/**
 * Language-specific accent variants for the Accent Playground.
 * Each accent maps to a BCP 47 language-region code used by expo-speech.
 */

export interface AccentVariant {
    /** BCP 47 language-region code for expo-speech (e.g., "en-US", "fr-CA") */
    bcp47: string;
    /** Human-readable accent name (e.g., "American", "Canadian") */
    name: string;
    /** ISO 3166-1 alpha-2 country code for flag display (e.g., "us", "ca") */
    countryCode: string;
}

/**
 * Accent variants per language code.
 * Keys match the `code` field in SUPPORTED_LANGUAGES (ISO 639-1).
 * Values are arrays of regional accent variants with BCP 47 codes.
 */
export const LANGUAGE_ACCENTS: Record<string, AccentVariant[]> = {
    // Multi-accent languages
    en: [
        { bcp47: "en-US", name: "American", countryCode: "us" },
        { bcp47: "en-GB", name: "British", countryCode: "gb" },
        { bcp47: "en-AU", name: "Australian", countryCode: "au" },
        { bcp47: "en-IN", name: "Indian", countryCode: "in" },
    ],
    fr: [
        { bcp47: "fr-FR", name: "France", countryCode: "fr" },
        { bcp47: "fr-CA", name: "Canadian", countryCode: "ca" },
    ],
    es: [
        { bcp47: "es-ES", name: "Spain", countryCode: "es" },
        { bcp47: "es-MX", name: "Mexican", countryCode: "mx" },
    ],
    pt: [
        { bcp47: "pt-BR", name: "Brazilian", countryCode: "br" },
        { bcp47: "pt-PT", name: "European", countryCode: "pt" },
    ],
    zh: [
        { bcp47: "zh-CN", name: "Mainland", countryCode: "cn" },
        { bcp47: "zh-TW", name: "Taiwan", countryCode: "tw" },
    ],
    ar: [
        { bcp47: "ar-SA", name: "Saudi", countryCode: "sa" },
        { bcp47: "ar-EG", name: "Egyptian", countryCode: "eg" },
    ],

    // Single-accent languages
    hi: [{ bcp47: "hi-IN", name: "Standard", countryCode: "in" }],
    ja: [{ bcp47: "ja-JP", name: "Standard", countryCode: "jp" }],
    ko: [{ bcp47: "ko-KR", name: "Standard", countryCode: "kr" }],
    it: [{ bcp47: "it-IT", name: "Standard", countryCode: "it" }],
    ru: [{ bcp47: "ru-RU", name: "Standard", countryCode: "ru" }],
    de: [{ bcp47: "de-DE", name: "Standard", countryCode: "de" }],
    sv: [{ bcp47: "sv-SE", name: "Standard", countryCode: "se" }],
    vi: [{ bcp47: "vi-VN", name: "Standard", countryCode: "vn" }],
    id: [{ bcp47: "id-ID", name: "Standard", countryCode: "id" }],
    ur: [{ bcp47: "ur-PK", name: "Standard", countryCode: "pk" }],
    ta: [{ bcp47: "ta-IN", name: "Standard", countryCode: "in" }],
    bn: [{ bcp47: "bn-IN", name: "Standard", countryCode: "in" }],
    sw: [{ bcp47: "sw-KE", name: "Standard", countryCode: "ke" }],
};

/**
 * Get accent variants for a language code.
 * Falls back to a generic "Standard" entry if language is not mapped.
 */
export function getAccentsForLanguage(langCode: string): AccentVariant[] {
    return LANGUAGE_ACCENTS[langCode] ?? [
        { bcp47: langCode, name: "Standard", countryCode: "" },
    ];
}

/**
 * Get the default (first) accent for a language.
 */
export function getDefaultAccent(langCode: string): AccentVariant {
    const accents = getAccentsForLanguage(langCode);
    return accents[0];
}

/**
 * Natural-language accent descriptions keyed by BCP 47 code.
 * Used in Gemini system prompts to control spoken accent/dialect.
 */
const ACCENT_DESCRIPTIONS: Record<string, string> = {
    // English
    "en-US": "American English, as spoken in the United States",
    "en-GB": "British English, as spoken in England",
    "en-AU": "Australian English, as spoken in Australia",
    "en-IN": "Indian English, as spoken in India",
    // French
    "fr-FR": "Standard French, as spoken in France",
    "fr-CA": "Canadian French, as spoken in Quebec, Canada",
    // Spanish
    "es-ES": "Castilian Spanish, as spoken in Spain",
    "es-MX": "Mexican Spanish, as spoken in Mexico",
    // Portuguese
    "pt-BR": "Brazilian Portuguese, as spoken in Brazil",
    "pt-PT": "European Portuguese, as spoken in Portugal",
    // Chinese
    "zh-CN": "Mandarin Chinese, as spoken in mainland China",
    "zh-TW": "Mandarin Chinese, as spoken in Taiwan",
    // Arabic
    "ar-SA": "Arabic, as spoken in Saudi Arabia",
    "ar-EG": "Egyptian Arabic, as spoken in Egypt",
    // Single-accent languages
    "hi-IN": "Hindi, as spoken in India",
    "ja-JP": "Japanese, as spoken in Japan",
    "ko-KR": "Korean, as spoken in South Korea",
    "it-IT": "Italian, as spoken in Italy",
    "ru-RU": "Russian, as spoken in Russia",
    "de-DE": "German, as spoken in Germany",
    "sv-SE": "Swedish, as spoken in Sweden",
    "vi-VN": "Vietnamese, as spoken in Vietnam",
    "id-ID": "Indonesian, as spoken in Indonesia",
    "ur-PK": "Urdu, as spoken in Pakistan",
    "ta-IN": "Tamil, as spoken in India",
    "bn-IN": "Bengali, as spoken in India",
    "sw-KE": "Swahili, as spoken in Kenya",
};

/**
 * Get a natural-language accent description for a BCP 47 code.
 * Returns null if the code is not mapped.
 */
export function getAccentDescription(bcp47Code: string): string | null {
    return ACCENT_DESCRIPTIONS[bcp47Code] ?? null;
}
