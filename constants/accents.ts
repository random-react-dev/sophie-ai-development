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
    "en-US": "General American English — the standard US broadcast accent, clear and rhotic, as heard on national US news networks",
    "en-GB": "Standard British English (Received Pronunciation) — as spoken by educated speakers in London and southern England, non-rhotic with clear vowel distinctions",
    "en-AU": "Standard Australian English — as spoken in Sydney, with characteristic vowel shifts and rising intonation",
    "en-IN": "Standard Indian English — as spoken by educated speakers in New Delhi, with retroflex consonants and syllable-timed rhythm",
    // French
    "fr-FR": "Standard Metropolitan French — as spoken by educated speakers in Paris, with standard liaison rules and nasal vowels",
    "fr-CA": "Standard Quebec French — as spoken in Montreal, with characteristic vowel laxing and affrication of /t/ and /d/ before high vowels",
    // Spanish
    "es-ES": "Standard Castilian Spanish — as spoken in Madrid, Spain, with the characteristic theta sound for 'c' and 'z' (distincion)",
    "es-MX": "Standard Mexican Spanish — as spoken in Mexico City, with clear pronunciation and seseo",
    // Portuguese
    "pt-BR": "Standard Brazilian Portuguese — as spoken in Sao Paulo, with open vowels and palatalized /t/ and /d/ before /i/",
    "pt-PT": "Standard European Portuguese — as spoken in Lisbon, with reduced unstressed vowels and sibilant /s/",
    // Chinese
    "zh-CN": "Standard Mandarin Chinese (Putonghua) — as spoken in Beijing, with standard four-tone pronunciation",
    "zh-TW": "Standard Taiwanese Mandarin — as spoken in Taipei, with softer retroflex consonants and distinct intonation patterns",
    // Arabic
    "ar-SA": "Modern Standard Arabic with a Saudi accent — as spoken by educated speakers in Riyadh, with emphatic consonants and clear pronunciation",
    "ar-EG": "Egyptian Arabic — as spoken in Cairo, with characteristic /g/ for qaf and recognizable melodic intonation",
    // Single-accent languages
    "hi-IN": "Standard Hindi (Khariboli) — as spoken by educated speakers in New Delhi, with clear Devanagari-based pronunciation",
    "ja-JP": "Standard Japanese (Hyojungo) — as spoken in Tokyo, with standard pitch accent patterns",
    "ko-KR": "Standard Korean (Pyojuneo) — as spoken in Seoul, with standard vowel and consonant distinctions",
    "it-IT": "Standard Italian — as spoken in Rome and Florence, with clear open vowels and geminate consonants",
    "ru-RU": "Standard Russian — as spoken in Moscow, with characteristic akan'ye vowel reduction and palatalized consonants",
    "de-DE": "Standard High German (Hochdeutsch) — as spoken in Hanover, with clear consonant articulation and standard vowel length",
    "sv-SE": "Standard Swedish (Rikssvenska) — as spoken in Stockholm, with characteristic pitch accent and rounded vowels",
    "vi-VN": "Standard Northern Vietnamese — as spoken in Hanoi, with all six tones clearly distinguished",
    "id-ID": "Standard Indonesian (Bahasa Indonesia) — as spoken in Jakarta, with clear syllable-timed pronunciation",
    "ur-PK": "Standard Urdu — as spoken by educated speakers in Islamabad and Lahore, with clear Nastaliq-based pronunciation",
    "ta-IN": "Standard Tamil — as spoken in Chennai, with retroflex consonants and clear vowel distinctions",
    "bn-IN": "Standard Bengali — as spoken in Kolkata, with characteristic aspirated consonants and nasal vowels",
    "sw-KE": "Standard Swahili — as spoken in Nairobi, Kenya, with clear Bantu vowel system and penultimate stress",
};

/**
 * Get a natural-language accent description for a BCP 47 code.
 * Returns null if the code is not mapped.
 */
export function getAccentDescription(bcp47Code: string): string | null {
    return ACCENT_DESCRIPTIONS[bcp47Code] ?? null;
}
