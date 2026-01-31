import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { CustomToggle } from "@/components/common/CustomToggle";
import { RainbowBorder } from "@/components/common/Rainbow";
import { RainbowWave } from "@/components/lesson/RainbowWave";
import LanguageSelectorModal from "@/components/tutor/LanguageSelectorModal";
import { Language } from "@/constants/languages";
import { audioRecorder } from "@/services/audio/recorder";
import { audioStreamer } from "@/services/audio/streamer";
import { translateText } from "@/services/gemini/translate";
import { geminiWebSocket } from "@/services/gemini/websocket";
import { supabase } from "@/services/supabase/client";
import { saveToVocabulary } from "@/services/supabase/vocabulary";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useLearningStore } from "@/stores/learningStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { useRouter } from "expo-router";
import { Globe, RotateCcw } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
- Be encouraging and celebrate progress`;
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
  } = useConversationStore();
  const {
    selectedScenario,
    selectScenario,
    practicePhrase,
    setPracticePhrase,
  } = useScenarioStore();
  const {
    targetLanguage,
    nativeLanguage,
    setTargetLanguage,
    setNativeLanguage,
  } = useLearningStore();
  const { session, user } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);
  const isInitialized = useRef(false);
  const router = useRouter();
  const { t } = useTranslation();

  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Language picker state
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"target" | "native">("target");

  // Recording timer state
  const [recordingTime, setRecordingTime] = useState(0);

  // Alert modal state for reset confirmation
  const { alertState, showAlert, hideAlert } = useAlertModal();

  // Check if both languages are selected
  const canStartConversation =
    targetLanguage !== null && nativeLanguage !== null;

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

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      if (!session || isInitialized.current) return;

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

        if (!isMounted) return;

        // Build instruction based on context
        let instruction: string;

        if (practicePhrase) {
          instruction = `${buildTutorPrompt(targetLanguage, nativeLanguage)}

## Special Focus
The user wants to practice the phrase: "${practicePhrase}".
Help them use this phrase naturally in conversation.`;
        } else if (selectedScenario) {
          instruction = `${buildTutorPrompt(targetLanguage, nativeLanguage)}

## Roleplay Scenario
Scenario: ${selectedScenario.title}
Your Role: ${selectedScenario.sophieRole}
User Role: ${selectedScenario.userRole}
Level: ${selectedScenario.level}
Context: ${selectedScenario.context}
Topic: ${selectedScenario.topic}

Stay in character while teaching.`;
        } else {
          instruction = buildTutorPrompt(targetLanguage, nativeLanguage);
        }

        Logger.info(
          TAG,
          `Connecting WebSocket for ${targetLanguage.name} lesson (explaining in ${nativeLanguage.name})`,
        );
        geminiWebSocket.connect(token, instruction);

        // Start session timer when connection is established
        setSessionStartTime(Date.now());
      } catch (err) {
        if (isMounted) {
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          Logger.error(TAG, "Gemini session initialization error", err);
          Alert.alert("Error", errorMessage);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
      Logger.info(TAG, "Cleaning up Talk Hub...");
      geminiWebSocket.disconnect();
      audioRecorder.stop().catch(() => {
        /* ignore */
      });
      audioStreamer.clearQueue();
      isInitialized.current = false;
    };
  }, [
    session?.user?.id,
    session,
    selectedScenario,
    practicePhrase,
    targetLanguage,
    nativeLanguage,
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
      const success = await saveToVocabulary({ phrase: text });
      if (success) {
        showAlert(
          t("talk_screen.alerts.success_title"),
          t("talk_screen.alerts.vocab_added"),
          undefined,
          "success",
        );
      }
    },
    [showAlert, t],
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

      {/* Language Selection */}
      <View className="px-6 py-2 flex-row justify-center items-center gap-4">
        {/* Target Language (what to learn) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setPickerMode("target");
            setShowLanguagePicker(true);
          }}
          className="items-center"
        >
          <View className="w-12 h-12 rounded-xl bg-white border border-gray-200 items-center justify-center shadow-sm">
            {targetLanguage ? (
              <Text className="text-2xl">{targetLanguage.flag}</Text>
            ) : (
              <Globe size={20} color="#9ca3af" />
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
          onPress={() => {
            setPickerMode("native");
            setShowLanguagePicker(true);
          }}
          className="items-center"
        >
          <View className="w-12 h-12 rounded-xl bg-white border border-gray-200 items-center justify-center shadow-sm">
            {nativeLanguage ? (
              <Text className="text-2xl">{nativeLanguage.flag}</Text>
            ) : (
              <Globe size={20} color="#9ca3af" />
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

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={(lang) => {
          if (pickerMode === "target") {
            setTargetLanguage(lang);
          } else {
            setNativeLanguage(lang);
          }
          setShowLanguagePicker(false);
        }}
        selectedCode={
          pickerMode === "target" ? targetLanguage?.code : nativeLanguage?.code
        }
        title={
          pickerMode === "target"
            ? t("talk_screen.language_selector.target_title")
            : t("talk_screen.language_selector.native_title")
        }
      />

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
