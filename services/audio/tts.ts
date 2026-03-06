import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { Logger } from "@/services/common/Logger";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

// Default BCP 47 for iOS — bare codes like "es" may pick unpredictable regional variant
const DEFAULT_BCP47: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-BR",
  zh: "zh-CN",
  ar: "ar-SA",
  de: "de-DE",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
  ru: "ru-RU",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  vi: "vi-VN",
  th: "th-TH",
  id: "id-ID",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  uk: "uk-UA",
  sv: "sv-SE",
};

const TAG = "TTS";

let cachedVoices: Speech.Voice[] = [];
let isTTSInitialized = false;

/**
 * Initializes the TTS engine by fetching available voices and playing a silent
 * utterance to "warm up" the native engine. This prevents the cold-start delay.
 */
export async function initializeTTS(): Promise<void> {
  if (isTTSInitialized) return;

  try {
    cachedVoices = await Speech.getAvailableVoicesAsync();
    Logger.info(TAG, `Fetched ${cachedVoices.length} available TTS voices.`);

    // Play a silent, zero-volume utterance to warm up the engine instantly
    Speech.speak("", { volume: 0 });
    isTTSInitialized = true;
  } catch (error) {
    Logger.error(TAG, "Failed to initialize TTS voices", error);
  }
}

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

  // Ensure TTS is initialized (it might be fast-called before app fully loaded)
  if (!isTTSInitialized && cachedVoices.length === 0) {
    await initializeTTS();
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

  // VOICE LOCKING: Find a local-only voice to prevent the Android network-buffering delay bug
  let selectedVoiceId: string | undefined = undefined;

  if (cachedVoices.length > 0) {
    // 1. Prioritize a voice that matches exactly and is strictly local
    let matchedVoice = cachedVoices.find(
      (v) =>
        v.language.startsWith(targetLang) && (v as any).localService === true,
    );

    // 2. Fallback to any matching voice if no strictly local one is found
    if (!matchedVoice) {
      matchedVoice = cachedVoices.find((v) =>
        v.language.startsWith(targetLang),
      );
    }

    if (matchedVoice) {
      selectedVoiceId = matchedVoice.identifier;
      // If we found a voice, we should trust its specific language tag format for the speak options
      targetLang = matchedVoice.language;
    }
  }

  Logger.info(
    TAG,
    `Speaking: "${text}" in ${languageName ?? "unknown"} (${targetLang}) at ${rate}x. Voice ID: ${selectedVoiceId || "default"}`,
  );

  // On iOS, reset audio session from playAndRecord (set by speech recognition)
  // back to playback mode, and enable audio even in silent mode
  if (Platform.OS === "ios") {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    });
  }

  // Stop any currently playing speech before starting new
  await Speech.stop();

  const speechOptions: Speech.SpeechOptions = {
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
  };

  // Only pass voice on Android/iOS if we explicitly locked one, otherwise let system decide
  if (selectedVoiceId) {
    speechOptions.voice = selectedVoiceId;
  }

  Speech.speak(text, speechOptions);
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

