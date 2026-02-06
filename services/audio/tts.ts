import * as Speech from "expo-speech";
import {
  getLanguageByCode,
  Language,
  SUPPORTED_LANGUAGES,
} from "@/constants/languages";
import { Logger } from "@/services/common/Logger";

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
 */
export async function speakWord(
  text: string,
  languageName: string | null | undefined,
  callbacks?: TTSCallbacks,
): Promise<void> {
  if (!text.trim()) {
    Logger.warn(TAG, "Empty text provided to speakWord");
    return;
  }

  const languageCode = languageName ? getLanguageCode(languageName) : null;
  const targetLang = languageCode ?? "en";

  Logger.info(TAG, `Speaking: "${text}" in ${languageName ?? "unknown"} (${targetLang})`);

  // Stop any currently playing speech before starting new
  await Speech.stop();

  Speech.speak(text, {
    language: targetLang,
    pitch: 1.0,
    rate: 1.0,
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
