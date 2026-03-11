const DEFAULT_MODEL_PRIMARY =
  "models/gemini-2.5-flash-native-audio-preview-12-2025";
const DEFAULT_MODEL_FALLBACK = DEFAULT_MODEL_PRIMARY;
const DEFAULT_VOICE_NAME = "Aoede";

const envMaxTokens = process.env.EXPO_PUBLIC_GEMINI_MAX_OUTPUT_TOKENS;
const parsedMaxTokens = envMaxTokens ? Number(envMaxTokens) : 2048;

export const GEMINI_LIVE_MODEL_PRIMARY =
  process.env.EXPO_PUBLIC_GEMINI_LIVE_MODEL_PRIMARY || DEFAULT_MODEL_PRIMARY;
export const GEMINI_LIVE_MODEL_FALLBACK =
  process.env.EXPO_PUBLIC_GEMINI_LIVE_MODEL_FALLBACK || DEFAULT_MODEL_FALLBACK;
export const GEMINI_LIVE_VOICE_NAME =
  process.env.EXPO_PUBLIC_GEMINI_LIVE_VOICE_NAME || DEFAULT_VOICE_NAME;
export const GEMINI_LIVE_MAX_OUTPUT_TOKENS =
  Number.isFinite(parsedMaxTokens) && parsedMaxTokens > 0
    ? Math.floor(parsedMaxTokens)
    : 2048;
