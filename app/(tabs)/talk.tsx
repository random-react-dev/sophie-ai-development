import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { CustomToggle } from "@/components/common/CustomToggle";
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
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  Bookmark,
  CheckCircle2,
  Globe,
  RotateCcw,
  Wand2,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  nativeLang: Language
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
    isPTTActive,
    volumeLevel,
    messages,
    showTranscript,
    isConversationActive,
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
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialized = useRef(false);
  const router = useRouter();

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
          "Waiting for language selection before initializing..."
        );
        return;
      }

      isInitialized.current = true;

      try {
        Logger.info(TAG, "Initializing Gemini session...");
        let token = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

        if (!token) {
          const { data, error } = await supabase.functions.invoke(
            "get-gemini-session"
          );
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
          `Connecting WebSocket for ${targetLanguage.name} lesson (explaining in ${nativeLanguage.name})`
        );
        geminiWebSocket.connect(token, instruction);
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
    if (isSpeaking) return "Sophie Speaking...";
    if (isListening) return "Listening...";
    if (isConversationActive) return "Hold mic to speak";
    switch (connectionState) {
      case "idle":
        return "Ready";
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Hold mic to speak";
      case "reconnecting":
        return "Reconnecting...";
      case "error":
        return error || "Error";
    }
  };

  const getDotColor = (): string => {
    if (isSpeaking) return "bg-purple-500";
    if (isListening) return "bg-blue-500";
    if (isConversationActive) return "bg-green-500";
    switch (connectionState) {
      case "idle":
        return "bg-gray-400";
      case "connecting":
      case "reconnecting":
        return "bg-orange-500";
      case "connected":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
    }
  };

  useEffect(() => {
    if (showTranscript) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, showTranscript]);

  const handleFinish = () => {
    if (messages.length === 0) {
      Alert.alert("End Session", "Go back to scenario library?", [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => router.push("/(tabs)") },
      ]);
      return;
    }

    Alert.alert(
      "Finish Conversation",
      "Are you done with this practice session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: () => {
            router.push("/report" as any);
          },
        },
      ]
    );
  };

  const handleReset = () => {
    showAlert(
      "Reset Chat",
      "This will clear the current conversation and reset Sophie. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
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
          },
        },
      ],
      "warning"
    );
  };

  const handleTranslate = async (text: string) => {
    try {
      const translated = await translateText(text, "English");
      Alert.alert("Translation", translated);
    } catch {
      Alert.alert("Error", "Failed to translate. Please try again.");
    }
  };

  const handleSaveVocabulary = async (text: string) => {
    const success = await saveToVocabulary({ phrase: text });
    if (success) {
      Alert.alert("Success", "Added to your vocabulary!");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={["top"]}>
      <View className="px-6 py-4 mb-2 flex-row justify-center items-center relative">
        <View className="items-center">
          <Text className="text-black text-2xl font-bold">Sophie AI</Text>
          <Text className="text-gray-500 text-base font-medium">
            Native speaker in your pocket
          </Text>
        </View>
        <Link href="/profile" asChild>
          <TouchableOpacity className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 absolute left-6">
            {user?.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: user.user_metadata.avatar_url }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-blue-50">
                <Text className="text-blue-500 font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Link>
      </View>

      {/* Language Selection */}
      <View className="px-6 py-2 flex-row justify-center items-center gap-4">
        {/* Target Language (what to learn) */}
        <TouchableOpacity
          onPress={() => { setPickerMode('target'); setShowLanguagePicker(true); }}
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
            {targetLanguage ? 'Learning' : 'Select'}
          </Text>
        </TouchableOpacity>

        {/* Arrow */}
        <Text className="text-gray-300 text-lg mb-4">→</Text>

        {/* Native Language (explanations) */}
        <TouchableOpacity
          onPress={() => { setPickerMode('native'); setShowLanguagePicker(true); }}
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
            {nativeLanguage ? 'Explain in' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Interaction Area */}
      <View className="flex-1 px-6">
        {/* Conversation Area */}
        <View className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 h-[320px] overflow-hidden">
          {/* Status Bar inside the card */}
          <View className="flex items-end px-4 pt-4">
            <View className="flex-row items-center gap-4">
              {/* Reset Button */}
              <TouchableOpacity
                onPress={handleReset}
                className="p-2 bg-gray-100 rounded-full"
              >
                <RotateCcw size={16} color="gray" />
              </TouchableOpacity>

              <View className="flex-row items-center gap-2">
                <Text className="text-blue-500 text-sm font-bold">
                  Transcript
                </Text>
                <CustomToggle
                  value={showTranscript}
                  onValueChange={setShowTranscript}
                />
              </View>
            </View>
          </View>

          {/* Rainbow Wave */}
          <View className="flex-1 justify-center items-center relative">
            {/* Recording Timer */}
            {isPTTActive && (
              <View className="absolute top-4 bg-red-500 px-4 py-2 rounded-full flex-row items-center z-10">
                <View className="w-2 h-2 rounded-full bg-white mr-2" />
                <Text className="text-white font-semibold">{formatTime(recordingTime)}</Text>
              </View>
            )}
            <RainbowWave
              isListening={isListening}
              isSpeaking={isSpeaking}
              volumeLevel={volumeLevel}
            />
          </View>
        </View>

        <View className="flex-1 mt-6">
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {messages.length === 0 ? (
              <View className="items-center mt-10">
                <View className="w-16 h-16 rounded-3xl bg-blue-500 items-center justify-center mb-4">
                  <Feather name="mic" size={26} color="white" />
                </View>
                {!canStartConversation ? (
                  <Text className="text-black/60 font-medium text-center px-10 leading-5">
                    Select both languages above to start your lesson with
                    Sophie.
                  </Text>
                ) : (
                  <Text className="text-black/60 font-medium text-center px-10 leading-5">
                    Hold the mic button below to start your{" "}
                    {selectedScenario ? "roleplay" : targetLanguage?.name}{" "}
                    lesson.
                  </Text>
                )}
              </View>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  className={`mb-6 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <View
                    className={`p-4 rounded-3xl max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-gray-100"
                        : "bg-white border border-gray-100 shadow-sm"
                    }`}
                  >
                    {msg.role === "model" && (
                      <View className="flex-row items-center gap-1 mb-1">
                        <Wand2 size={10} color="#3b82f6" />
                        <Text className="text-blue-500 text-[8px] font-black uppercase tracking-widest">
                          Natural Correction
                        </Text>
                      </View>
                    )}
                    <Text className="text-gray-900 text-base font-medium leading-relaxed">
                      {msg.text}
                    </Text>
                    <View className="flex-row mt-2 gap-4 border-t border-gray-50 pt-2">
                      <TouchableOpacity
                        className="flex-row items-center gap-1"
                        onPress={() => handleTranslate(msg.text)}
                      >
                        <Globe size={12} color="#94a3b8" />
                        <Text className="text-[10px] text-gray-400 font-bold">
                          Translate
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-row items-center gap-1"
                        onPress={() => handleSaveVocabulary(msg.text)}
                      >
                        <Bookmark size={12} color="#94a3b8" />
                        <Text className="text-[10px] text-gray-400 font-bold">
                          Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* Floating Action Button for Finish */}
      {messages.length > 0 && (
        <View className="px-6 pb-10 items-center">
          <TouchableOpacity
            onPress={handleFinish}
            className="px-8 py-4 bg-gray-900 rounded-3xl flex-row items-center gap-3 shadow-xl"
          >
            <CheckCircle2 size={20} color="white" />
            <Text className="text-white font-bold text-base">
              Finish & Get Report
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pad for the Tab Bar Mic Button */}
      <View className="h-20" />

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
            ? "What do you want to learn?"
            : "What's your native language?"
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
