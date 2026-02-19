import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { Logger } from "@/services/common/Logger";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

// Default BCP 47 for iOS — bare codes like "es" may pick unpredictable regional variant
const DEFAULT_BCP47: Record<string, string> = {
  en: "en-US", es: "es-ES", fr: "fr-FR", pt: "pt-BR", zh: "zh-CN",
  ar: "ar-SA", de: "de-DE", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN",
  ru: "ru-RU", it: "it-IT", nl: "nl-NL", pl: "pl-PL", tr: "tr-TR",
  vi: "vi-VN", th: "th-TH", id: "id-ID", bn: "bn-IN", ta: "ta-IN",
  te: "te-IN", mr: "mr-IN", gu: "gu-IN", uk: "uk-UA", sv: "sv-SE",
};

const TAG = "TTS";

/**
 * Callbacks for TTS state changes.
 */
export interface TTSCallbacks {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Maps language names (e.g., "Hindi", "Spanish") to ISO 639-1 codes
 * using the existing SUPPORTED_LANGUAGES constant.
 */
function getLanguageCode(languageName: string): string | null {
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.name === languageName);
  return match?.code ?? null;
}

/**
 * Speaks a word or phrase using the device's native text-to-speech engine.
 * Stops any currently playing speech before starting.
 *
 * @param text The text to speak (e.g., "नमस्ते")
 * @param languageName The language name from SUPPORTED_LANGUAGES (e.g., "Hindi")
 * @param callbacks Optional callbacks for start/done/error events
 * @param rate Speech rate (0.25–2.0, default 1.0)
 * @param accentCode Optional BCP 47 language-region code (e.g., "en-AU", "fr-CA")
 *                   to select a specific accent. Overrides the derived language code.
 */
export async function speakWord(
  text: string,
  languageName: string | null | undefined,
  callbacks?: TTSCallbacks,
  rate: number = 1.0,
  accentCode?: string,
): Promise<void> {
  if (!text.trim()) {
    Logger.warn(TAG, "Empty text provided to speakWord");
    return;
  }

  const derivedCode = languageName ? getLanguageCode(languageName) : null;

  // Use accent only if it matches the item's base language
  // Prevents applying Spanish accent to French vocab items
  let targetLang: string;
  if (accentCode && derivedCode && accentCode.startsWith(derivedCode)) {
    targetLang = accentCode;
  } else {
    targetLang = derivedCode ?? accentCode ?? "en";
  }

  // Android: expo-speech uses Locale(string) which breaks on BCP 47 "es-ES".
  // Strip region to get bare code that Locale() handles correctly.
  // iOS: ensure full BCP 47 for better voice selection.
  if (Platform.OS === "android" && targetLang.includes("-")) {
    targetLang = targetLang.split("-")[0];
  } else if (Platform.OS === "ios" && !targetLang.includes("-")) {
    targetLang = DEFAULT_BCP47[targetLang] ?? targetLang;
  }

  Logger.info(
    TAG,
    `Speaking: "${text}" in ${languageName ?? "unknown"} (${targetLang}) at ${rate}x`,
  );

  // Stop any currently playing speech before starting new
  void Speech.stop();

  Speech.speak(text, {
    language: targetLang,
    pitch: 1.0,
    rate,
    volume: 1.0,
    onStart: callbacks?.onStart,
    onDone: callbacks?.onDone,
    onError: (error) => {
      Logger.error(TAG, "TTS error", error);
      callbacks?.onError?.(error);
    },
  });
}

/**
 * Stops any ongoing speech immediately.
 */
export async function stopSpeaking(): Promise<void> {
  Logger.debug(TAG, "Stopping speech");
  await Speech.stop();
}

/**
 * Checks if speech is currently in progress.
 */
export async function isSpeaking(): Promise<boolean> {
  return await Speech.isSpeakingAsync();
}
