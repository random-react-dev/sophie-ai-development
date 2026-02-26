import { AudioManager } from "react-native-audio-api";
import { Platform } from "react-native";
import { Logger } from "../common/Logger";

const TAG = "AudioManagerSetup";

let isConfigured = false;

/**
 * Configure iOS audio session for duplex voice chat.
 * MUST be called BEFORE creating any AudioContext.
 * Enables hardware echo cancellation (AEC), automatic gain control (AGC),
 * and noise suppression for simultaneous recording and playback.
 */
export async function configureAudioSession(): Promise<void> {
  if (isConfigured) {
    Logger.debug(TAG, "Audio session already configured");
    return;
  }

  if (Platform.OS !== "ios") {
    Logger.debug(TAG, "Skipping audio session config (not iOS)");
    isConfigured = true;
    return;
  }

  try {
    // 1. Store our desired session options. These are used by react-native-audio-api
    //    whenever it (re)configures the session internally, ensuring our playAndRecord
    //    / voiceChat config is always applied — even after engine stop/start cycles.
    const options = {
      iosCategory: "playAndRecord" as const,
      iosMode: "voiceChat" as const,
      iosOptions: ["defaultToSpeaker" as const, "allowBluetoothHFP" as const],
    };
    Logger.info(
      TAG,
      `[DIAG] Setting audio session options: ${JSON.stringify(options)}`,
    );
    AudioManager.setAudioSessionOptions(options);
    Logger.info(TAG, "[DIAG] setAudioSessionOptions returned successfully");

    // 2. Activate the session with our config so it's ready before AudioContext creation.
    Logger.info(TAG, "[DIAG] Calling setAudioSessionActivity(true)...");
    const activateStart = Date.now();
    await AudioManager.setAudioSessionActivity(true);
    Logger.info(
      TAG,
      `[DIAG] setAudioSessionActivity(true) resolved in ${Date.now() - activateStart}ms`,
    );

    // NOTE: We intentionally do NOT call disableSessionManagement().
    // setAudioSessionOptions() already stores our desired config, so when
    // react-native-audio-api internally manages the session (e.g. during
    // AudioEngine stop/start cycles), it re-applies OUR options — not its
    // defaults. Disabling session management was preventing the engine from
    // properly re-activating the session on physical devices, causing silent
    // audio output (AudioContext reported "running" but no sound played).

    isConfigured = true;
    Logger.info(
      TAG,
      "[DIAG] iOS audio session fully configured and activated (session management enabled)",
    );
  } catch (error) {
    Logger.error(TAG, "[DIAG] Failed to configure audio session", error);
    Logger.warn(
      TAG,
      `[DIAG] Error details: ${error instanceof Error ? error.stack : String(error)}`,
    );
  }
}
