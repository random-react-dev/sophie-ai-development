import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { CustomToggle } from "@/components/common/CustomToggle";
import { RainbowBorder } from "@/components/common/Rainbow";
import { RainbowWave } from "@/components/lesson/RainbowWave";
import { Language, SUPPORTED_LANGUAGES } from "@/constants/languages";
import { audioRecorder } from "@/services/audio/recorder";
import { audioStreamer } from "@/services/audio/streamer";
import { translateText } from "@/services/gemini/translate";
import { geminiWebSocket } from "@/services/gemini/websocket";
import { supabase } from "@/services/supabase/client";
import { saveToVocabulary } from "@/services/supabase/vocabulary";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { useFocusEffect, useRouter } from "expo-router";
import { RotateCcw } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "@/hooks/useTranslation";

import { MessageBubble } from "@/components/common/MessageBubble";
import { PageHeader } from "@/components/common/PageHeader";
import { Logger } from "@/services/common/Logger";
import { Feather } from "@expo/vector-icons";

const TAG = "TalkTab";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Hello words for initial greeting
const HELLO_WORDS: Record<string, string> = {
  en: "Hello",
  es: "Hola",
  fr: "Bonjour",
  de: "Hallo",
  ja: "Konnichiwa",
  zh: "Ni hao",
  ko: "Annyeong",
  it: "Ciao",
  pt: "Olá",
  hi: "Namaste",
  ar: "Marhaba",
  ru: "Privet",
};

const getHelloWord = (code: string): string => HELLO_WORDS[code] || "Hello";

// Build tutor prompt with language context
const buildTutorPrompt = (
  targetLang: Language,
  nativeLang: Language,
): string => {
  return `You are Sophie, a warm and encouraging AI language tutor.

## Context
- User wants to learn: ${targetLang.name}
- User's native language: ${nativeLang.name}

## Your Teaching Style
- Be warm, patient, and non-judgmental
- Celebrate small wins with genuine encouragement
- When user makes mistakes, gently correct without making them feel bad
- Use the sandwich method: positive → correction → positive

## Greeting
Start by greeting the user in their native language (${
    nativeLang.name
  }), then introduce the lesson:
"Welcome to your ${
    targetLang.name
  } lesson! Let's start with a simple greeting. The word for 'hello' in ${
    targetLang.name
  } is '${getHelloWord(targetLang.code)}'. Can you try saying it?"

## Lesson Flow
1. Introduce a word/phrase in ${targetLang.name}
2. Ask user to repeat it
3. Listen and provide feedback
4. If correct: "That's great! You're doing wonderfully." + next challenge
5. If needs work: "Good try! Let me help you with that..." + gentle guidance

## Key Rules
- Keep responses short and conversational (2-3 sentences max)
- Always respond in ${nativeLang.name} when explaining, but use ${
    targetLang.name
  } for the words being taught
- Never make the user feel bad about mistakes
- Be encouraging and celebrate progress

## STRICT Rules (CRITICAL)
- **NO Internal Monologue**: NEVER output your internal thought process, planning, or confirmation of instructions.
- **NO Meta-Commentary**: Do NOT say "Okay, I will...", "My plan is...", "I'm setting up...", or "Understood".
- **Immediate Start**: Start the roleplay or lesson IMMEDIATELY with the first spoken line content.
- **Direct Action**: Just DO the lesson. Do not talk ABOUT doing the lesson.`;
};

// Build roleplay prompt with language context
const buildRoleplayPrompt = (
  targetLang: Language,
  nativeLang: Language,
): string => {
  return `You are Sophie, a warm and encouraging AI language tutor helping the user practice via roleplay.

## Context
- User wants to learn: ${targetLang.name}
- User's native language: ${nativeLang.name}

## Your Persona
- Be warm, patient, and encouraging
- Stay STRICTLY in character for the roleplay
- If the user struggles, gently help them (in character or as a helpful aside if absolutely necessary)
- Keep responses short and conversational (2-3 sentences max)

## STRICT Rules
- **NO Internal Monologue**: NEVER output your internal thought process.
- **NO Meta-Commentary**: Do NOT say "Okay, I will start...".
- **Stay in Character**: You are the character defined in the scenario. act like it.
- **Language**: Speak primarily in ${targetLang.name} suitable for the role. Use ${nativeLang.name} ONLY if the user is stuck or needs complex explanation.`;
};

export default function TalkScreen() {
  const {
    connectionState,
    error,
    isListening,
    isSpeaking,
    isProcessing,
    isPTTActive,
    volumeLevel,
    bufferProgress,
    messages,
    showTranscript,
    setShowTranscript,
    clearMessages,
    setHasGreeted,
    stopConversation,
    sessionProfileId,
    setSessionProfileId,
    activeScenarioTimestamp,
    setActiveScenarioTimestamp,
  } = useConversationStore();
  const {
    selectedScenario,
    selectScenario,
    practicePhrase,
    setPracticePhrase,
    scenarioSelectionTimestamp,
  } = useScenarioStore();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { session, user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const isInitialized = useRef<boolean>(false);
  const router = useRouter();
  const { t } = useTranslation();

  // Derive target and native languages from active profile
  const targetLanguage = useMemo((): Language | null => {
    if (!activeProfile?.target_language) return null;
    return (
      SUPPORTED_LANGUAGES.find(
        (l) => l.name === activeProfile.target_language,
      ) || null
    );
  }, [activeProfile?.target_language]);

  const nativeLanguage = useMemo((): Language | null => {
    // Use medium_language for explanations if set, otherwise use native_language
    const langName =
      activeProfile?.medium_language || activeProfile?.native_language;
    if (!langName) return null;
    return SUPPORTED_LANGUAGES.find((l) => l.name === langName) || null;
  }, [activeProfile?.medium_language, activeProfile?.native_language]);

  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Recording timer state
  const [recordingTime, setRecordingTime] = useState(0);

  // Alert modal state for reset confirmation
  const { alertState, showAlert, hideAlert } = useAlertModal();

  // Check if both languages are selected (profile exists)
  const canStartConversation =
    targetLanguage !== null && nativeLanguage !== null;

  // Fetch profiles on mount to ensure activeProfile is loaded
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfiles();
    }
  }, [session?.user?.id, fetchProfiles]);

  // Recording timer effect
  useEffect(() => {
    if (!isPTTActive) {
      setRecordingTime(0);
      return;
    }

    setRecordingTime(0);
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPTTActive]);

  // Handle Tab Focus: Pause audio when leaving, resume (replay from start) on return
  useFocusEffect(
    useCallback(() => {
      // On focus: Resume playback if there was a paused response
      Logger.info(TAG, "Talk tab focused");
      audioStreamer.resumePlayback();

      return () => {
        // On blur: Pause Sophie (fade out, but keep buffer for resume)
        Logger.info(TAG, "Talk tab blurred - pausing audio");
        audioStreamer.pausePlayback();
      };
    }, []),
  );

  // Initialize Session (Once on mount)
  useEffect(() => {
    let isMounted = true;

    // Only initialize if we haven't already
    // if (isInitialized.current) return; // REMOVED to allow re-init on language change

    const initSession = async () => {
      if (!session) return;

      // Don't initialize until both languages are selected
      if (!targetLanguage || !nativeLanguage) {
        Logger.info(
          TAG,
          "Waiting for language selection before initializing...",
        );
        return;
      }

      isInitialized.current = true;

      try {
        Logger.info(TAG, "Initializing Gemini session...");
        let token = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

        if (!token) {
          const { data, error } =
            await supabase.functions.invoke("get-gemini-session");
          if (error || !data?.token)
            throw new Error(error?.message || "No token returned");
          token = data.token;
        }

        if (!isMounted) {
          isInitialized.current = false;
          return;
        }

        // Build instruction based on context
        let instruction: string;
        let initialPrompt: string | undefined;

        if (practicePhrase) {
          instruction = `${buildTutorPrompt(targetLanguage, nativeLanguage)}

## Special Focus
The user wants to practice the phrase: "${practicePhrase}".
Help them use this phrase naturally in conversation.`;
          initialPrompt = `I want to practice saying "${practicePhrase}". Help me use it in a sentence.`;
        } else if (selectedScenario) {
          Logger.info(
            TAG,
            `Initializing for Scenario: ${selectedScenario.title}`,
          );
          instruction = `${buildRoleplayPrompt(targetLanguage, nativeLanguage)}

## Roleplay Scenario
Scenario: ${selectedScenario.title}
Your Role: ${selectedScenario.sophieRole}
User Role: ${selectedScenario.userRole}
Level: ${selectedScenario.level}
Context: ${selectedScenario.context}
Topic: ${selectedScenario.topic}

Stay in character while teaching.`;
          initialPrompt = `Start the roleplay now. You are ${selectedScenario.sophieRole}. Say your first line to set the scene.`;
        } else {
          Logger.info(TAG, "Initializing with Default Prompt (No Scenario)");
          instruction = buildTutorPrompt(targetLanguage, nativeLanguage);
          initialPrompt =
            "Say hi and ask me one simple question to start practicing. Keep it under 2 sentences.";
        }

        Logger.info(TAG, `Generated Instruction Length: ${instruction.length}`);
        Logger.info(TAG, `Initial Prompt: ${initialPrompt}`);

        Logger.info(
          TAG,
          `Connecting WebSocket for ${targetLanguage.name} lesson (explaining in ${nativeLanguage.name})`,
        );
        geminiWebSocket.connect(token, instruction, initialPrompt);

        // Start session timer when connection is established
        setSessionStartTime(Date.now());
      } catch (err) {
        if (isMounted) {
          isInitialized.current = false;
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          Logger.error(TAG, "Gemini session initialization error", err);
          Alert.alert("Error", errorMessage);
        }
      }
    };

    // If language changes after initialization, force a re-init
    // Check for Profile ID mismatch (Robust Fix for Background Switching)
    if (activeProfile?.id && sessionProfileId !== activeProfile.id) {
      Logger.info(
        TAG,
        `Profile Switch Detected (Old: ${sessionProfileId}, New: ${activeProfile.id}). Resetting...`,
      );
      stopConversation();
      clearMessages();
      setHasGreeted(false);
      selectScenario(null);
      setPracticePhrase(null);
      geminiWebSocket.disconnect();
      isInitialized.current = false;
      setSessionStartTime(null);
      setSessionProfileId(activeProfile.id);
      // The effect will re-run with isInitialized=false and start fresh
    }

    // Force re-init if scenario or practice phrase changes (including fresh selection of same scenario)
    // Checks against store's active timestamp to handle unmounts/remounts correctly
    if (scenarioSelectionTimestamp > activeScenarioTimestamp) {
      Logger.info(
        TAG,
        `New Scenario Selection Detected (Ts: ${scenarioSelectionTimestamp}). Resetting conversation...`,
      );
      stopConversation();
      clearMessages();
      setHasGreeted(false);
      geminiWebSocket.disconnect();
      isInitialized.current = false;
      setSessionStartTime(null);
      setActiveScenarioTimestamp(scenarioSelectionTimestamp);
    } else if (isInitialized.current) {
      // If initialized and effect re-ran, must be a config change (e.g. language) that didn't trigger profile switch or timestamp
      // Force reconnect to apply new config (e.g. prompt with new language)
      Logger.info(TAG, "Config changed, reconnecting...");
      geminiWebSocket.disconnect();
      isInitialized.current = false;
    }

    initSession();

    // Cleanup only on unmount (not on blur)
    return () => {
      isMounted = false;
      Logger.info(TAG, "Cleaning up Talk Hub (Component Unmount)...");
      geminiWebSocket.disconnect();
      audioRecorder.stop().catch(() => {});
      audioStreamer.dispose(); // Fully dispose on unmount
      isInitialized.current = false;
    };
  }, [
    session?.user?.id,
    // session, // REMOVED: Caused restart on token refresh
    targetLanguage, // Re-run when target language changes
    nativeLanguage, // Re-run when native language changes
    selectedScenario, // Re-run when scenario changes
    practicePhrase, // Re-run when practice phrase changes
    scenarioSelectionTimestamp, // Re-run when scenario is re-selected (even if same object)
  ]);

  const getStatusText = (): string => {
    if (isSpeaking) return t("talk_screen.status.speaking");
    // Show buffering progress during processing
    if (isProcessing && bufferProgress > 0 && bufferProgress < 100) {
      return t("talk_screen.status.preparing", { progress: bufferProgress });
    }
    if (isProcessing) return t("talk_screen.status.thinking");
    if (isListening) return t("talk_screen.status.listening");

    switch (connectionState) {
      case "connecting":
        return t("talk_screen.status.connecting");
      case "reconnecting":
        return t("talk_screen.status.reconnecting");
      case "error":
        return error || t("talk_screen.status.error");
      default:
        return t("talk_screen.status.hold_mic");
    }
  };

  useEffect(() => {
    if (showTranscript && messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, showTranscript]);

  const handleFinish = () => {
    if (messages.length === 0) {
      showAlert(
        t("talk_screen.alerts.end_session_title"),
        t("talk_screen.alerts.end_session_msg"),
        [
          { text: t("talk_screen.alerts.cancel"), style: "cancel" },
          {
            text: t("talk_screen.alerts.yes"),
            onPress: () => router.push("/(tabs)"),
          },
        ],
      );
      return;
    }

    // Calculate duration
    const endTime = Date.now();
    const durationSeconds = sessionStartTime
      ? Math.round((endTime - sessionStartTime) / 1000)
      : 0;

    showAlert(
      t("talk_screen.alerts.finish_title"),
      t("talk_screen.alerts.finish_msg"),
      [
        { text: t("talk_screen.alerts.cancel"), style: "cancel" },
        {
          text: t("talk_screen.alerts.finish"),
          onPress: () => {
            router.push({
              pathname: "/report",
              params: { duration: durationSeconds.toString() },
            });
          },
        },
      ],
      "info",
    );
  };

  const handleReset = () => {
    showAlert(
      t("talk_screen.alerts.reset_title"),
      t("talk_screen.alerts.reset_msg"),
      [
        { text: t("talk_screen.alerts.cancel"), style: "cancel" },
        {
          text: t("talk_screen.alerts.reset"),
          style: "destructive",
          onPress: async () => {
            await stopConversation();
            clearMessages();
            setHasGreeted(false);
            selectScenario(null);
            setPracticePhrase(null);
            // Force reconnect
            geminiWebSocket.disconnect();
            isInitialized.current = false;
            // Reset session timer
            setSessionStartTime(null);
          },
        },
      ],
      "warning",
    );
  };

  const handleTranslate = useCallback(
    async (text: string): Promise<string | null> => {
      try {
        const result = await translateText(text, "English");
        const displayText = result.romanization
          ? `${result.translation}\n\n${result.romanization}`
          : result.translation;
        return displayText;
      } catch {
        showAlert(
          t("talk_screen.alerts.error_title"),
          t("talk_screen.alerts.error_msg"),
          undefined,
          "error",
        );
        return null;
      }
    },
    [showAlert],
  );

  const handleSaveVocabulary = useCallback(
    async (text: string) => {
      const success = await saveToVocabulary({
        phrase: text,
        language: targetLanguage?.name,
      });
      if (success) {
        showAlert(
          t("talk_screen.alerts.success_title"),
          t("talk_screen.alerts.vocab_added"),
          undefined,
          "success",
        );
      }
    },
    [showAlert, t, targetLanguage],
  );

  // Message type for FlatList
  interface Message {
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: number;
  }

  // Memoized render function for FlatList performance
  const renderMessage = useCallback(
    ({ item: msg }: { item: Message }) => (
      <MessageBubble
        message={msg}
        onTranslate={handleTranslate}
        onSave={handleSaveVocabulary}
        userAvatarUri={user?.user_metadata?.avatar_url}
        userName={user?.user_metadata?.full_name || user?.email}
      />
    ),
    [handleTranslate, handleSaveVocabulary, user],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      {/* Language Selection - Dynamic from Profile */}
      <View className="px-6 py-2 flex-row justify-center items-center gap-4">
        {/* Target Language (what to learn) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/language")}
          className="items-center"
        >
          <View className="w-12 h-12 rounded-xl bg-white border border-gray-200 items-center justify-center shadow-sm">
            {targetLanguage ? (
              <Text className="text-2xl">{targetLanguage.flag}</Text>
            ) : (
              <Text className="text-2xl">🌐</Text>
            )}
          </View>
          <Text className="text-[10px] text-gray-500 mt-1 font-medium">
            {targetLanguage
              ? t("talk_screen.language_selector.learning_label")
              : t("talk_screen.language_selector.select_label")}
          </Text>
        </TouchableOpacity>

        {/* Arrow */}
        <Text className="text-gray-300 text-lg mb-4">→</Text>

        {/* Native Language (explanations) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(tabs)/language")}
          className="items-center"
        >
          <View className="w-12 h-12 rounded-xl bg-white border border-gray-200 items-center justify-center shadow-sm">
            {nativeLanguage ? (
              <Text className="text-2xl">{nativeLanguage.flag}</Text>
            ) : (
              <Text className="text-2xl">🌐</Text>
            )}
          </View>
          <Text className="text-[10px] text-gray-500 mt-1 font-medium">
            {nativeLanguage
              ? t("talk_screen.language_selector.explain_label")
              : t("talk_screen.language_selector.select_label")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Interaction Area */}
      <View className="flex-1 px-4 mt-2">
        {/* Conversation Area */}
        <View className="bg-white rounded-[40px] shadow-xl shadow-gray-200/50 border border-gray-100 h-[250px] overflow-hidden">
          {/* Premium Status Bar */}
          <View className="bg-gray-50/50 border-b border-gray-100">
            {/* Actions Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
                alignItems: "center",
                minWidth: "100%",
                justifyContent: "flex-end",
              }}
            >
              {/* Finish Button */}
              {messages.length > 0 && (
                <TouchableOpacity onPress={handleFinish} activeOpacity={0.7}>
                  <RainbowBorder
                    borderRadius={9999}
                    borderWidth={1.5}
                    className="flex-1"
                    containerClassName="px-3 py-2 flex-row items-center gap-1.5"
                  >
                    <Feather name="check-circle" size={12} color="black" />
                    <Text className="text-black font-bold text-xs">
                      {t("talk_screen.actions.finish_report")}
                    </Text>
                  </RainbowBorder>
                </TouchableOpacity>
              )}

              {/* Reset Control */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReset}
                className="w-8 h-8 items-center justify-center bg-white rounded-full border border-gray-100 shadow-sm"
              >
                <RotateCcw size={14} color="#64748b" />
              </TouchableOpacity>

              {/* Transcript Toggle */}
              <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                <Text className="text-black text-xs font-bold mr-2">
                  {t("talk_screen.actions.transcript")}
                </Text>
                <CustomToggle
                  value={showTranscript}
                  onValueChange={setShowTranscript}
                />
              </View>
            </ScrollView>
          </View>

          <View className="flex-1 justify-center items-center relative">
            {/* Recording Timer */}
            {isPTTActive && (
              <View className="absolute top-2 left-0 right-0 items-center z-10">
                <View className="bg-red-500/90 px-4 py-2 rounded-full flex-row items-center shadow-lg shadow-red-500/30">
                  <View className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  <Text className="text-white font-bold tracking-wide">
                    {formatTime(recordingTime)}
                  </Text>
                </View>
              </View>
            )}
            {/* Rainbow Wave */}
            <RainbowWave
              isListening={isListening}
              isSpeaking={isSpeaking}
              isProcessing={isProcessing}
              volumeLevel={volumeLevel}
            />
            {/* Status Text - shows buffering progress, thinking state, etc */}
            {(!!isProcessing || isSpeaking || isListening) && (
              <View className="absolute bottom-4">
                <Text className="text-gray-600 text-sm font-medium">
                  {getStatusText()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-1 mt-6">
          {!showTranscript ? (
            <View className="flex-1 items-center justify-center">
              {/* Hide transcript */}
              {/* <Text className="text-gray-400 font-medium">
                {t("talk_screen.actions.transcript_hidden")}
              </Text> */}
            </View>
          ) : messages.length === 0 ? (
            /* Premium Mic Button - matches tab bar design */
            <View className="items-center mt-10">
              <RainbowBorder
                borderRadius={20}
                borderWidth={2}
                className="w-16 h-16"
                style={{
                  shadowColor: "#70369D",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 8,
                }}
                containerClassName="items-center justify-center bg-blue-500"
              >
                <Feather name="mic" size={26} color="#FFA500" />
              </RainbowBorder>
              <View className="mt-4">
                {!canStartConversation ? (
                  <Text className="text-black/60 font-medium text-center px-10 leading-5">
                    {t("talk_screen.prompts.select_both_langs")}
                  </Text>
                ) : (
                  <Text className="text-black/60 font-medium text-center px-10 leading-6">
                    {t("talk_screen.prompts.hold_mic_start")}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              // onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={7}
            />
          )}
        </View>
      </View>

      {/* Pad for the Tab Bar Mic Button */}
      {/* <View className="h-20" /> */}

      {/* Language selection is now managed from the Profile page (/(tabs)/language) */}

      {/* Reset Confirmation Modal */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </SafeAreaView>
  );
}
