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
import { useFocusEffect, usePathname, useRouter } from "expo-router";

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
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "@/hooks/useTranslation";
import * as Haptics from "expo-haptics";

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
  return `You are Sophie AI, a warm and encouraging AI language tutor.

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

// Map scenario levels to conversation complexity guidance
const LEVEL_GUIDANCE: Record<string, string> = {
  S1: `BEGINNER LEVEL: Use very simple, short sentences. Speak slowly and clearly. Use common everyday words only. Repeat key vocabulary naturally. If the user struggles, immediately offer the word/phrase they need. Mix in their native language generously to keep them comfortable. Celebrate every attempt.`,
  S2: `ELEMENTARY LEVEL: Use simple but complete sentences. Introduce common phrases and expressions. Gently expand their vocabulary by offering alternatives ("You could also say..."). Keep your sentences short (1-2 clauses). Use their native language for new or tricky concepts.`,
  S3: `INTERMEDIATE LEVEL: Use natural conversational pace. Introduce idiomatic expressions and explain them briefly. Ask open-ended questions that require more than yes/no answers. Gently correct grammar in context. Use their native language only when they seem stuck.`,
  S4: `UPPER-INTERMEDIATE LEVEL: Speak naturally with varied sentence structures. Use professional or topic-specific vocabulary. Challenge them with nuanced questions. Correct subtle errors. Introduce colloquialisms and cultural context. Minimize native language use — push them to express themselves in the target language.`,
  S5: `ADVANCED LEVEL: Use complex, natural speech with idioms, humor, and cultural references. Engage in abstract discussions. Challenge their arguments and reasoning. Correct only significant errors. Speak almost entirely in the target language. Treat them as a capable speaker.`,
  S6: `MASTERY LEVEL: Speak as you would to a native speaker. Use sophisticated vocabulary, wordplay, sarcasm, and cultural nuance. Engage in deep, complex discussions. Only note very subtle errors or non-native patterns. Full immersion in target language.`,
};

// Build roleplay prompt with language context
const buildRoleplayPrompt = (
  targetLang: Language,
  nativeLang: Language,
): string => {
  return `You are Sophie AI, an incredibly engaging and natural AI language tutor helping the user practice real-world conversations through immersive roleplay.

## Language Context
- User is learning: ${targetLang.name}
- User's native language: ${nativeLang.name}

## Core Roleplay Principles
- **BE the character** — fully embody the role with personality, emotions, and natural reactions. You are NOT an AI tutor pretending; you ARE this person.
- **React authentically** — respond to what the user actually says. Show surprise, curiosity, humor, empathy. Don't give scripted responses.
- **Drive the conversation forward** — always give the user something to respond to. Ask questions, share opinions, introduce new elements, create small moments of tension or humor.
- **Keep it flowing** — if the user gives a short answer, don't just accept it. Dig deeper ("Oh really? Tell me more!"), share something related, or introduce a natural twist.
- **Make it memorable** — add small realistic details (sounds, descriptions of what you're doing, reactions) that make the scene come alive.

## Conversation Pacing
- Keep responses conversational: 2-4 sentences, like a real person talking
- Vary your response length naturally — sometimes short and punchy, sometimes a bit longer when sharing something interesting
- Don't ask more than one question at a time
- Leave natural pauses and openings for the user to jump in

## Helping the User Learn (While Staying in Character)
- If the user makes a mistake, correct it NATURALLY within your response (rephrase what they said correctly as part of your reply, don't lecture)
- If they seem stuck, offer a gentle hint IN CHARACTER ("Did you mean...?" or "Are you looking for the word...?")
- Only break character briefly if they are truly lost — use a quick aside in ${nativeLang.name} marked with parentheses, then return to character immediately

## STRICT Rules (CRITICAL — NEVER VIOLATE)
- **NO Internal Monologue**: NEVER output your thought process, planning, or setup.
- **NO Meta-Commentary**: NEVER say "Okay, I will...", "Let me start the roleplay...", "In this scenario...", or anything that breaks the fourth wall.
- **IMMEDIATE Immersion**: Your very first word should be IN CHARACTER. Jump straight into the scene.
- **Language**: Speak primarily in ${targetLang.name}. Use ${nativeLang.name} ONLY in brief parenthetical asides when the user is truly stuck.`;
};

export default function TalkScreen() {
  const {
    connectionState,
    error,
    isListening,
    isSpeaking,
    isProcessing,
    isPTTActive,
    startPTTRecording,
    stopPTTRecording,
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
  const pathname = usePathname();
  const isFocused = pathname === "/talk";
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

  // --- Floating PTT Button State ---
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation ONLY when recording
  useEffect(() => {
    if (!isPTTActive) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isPTTActive]);

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handlePTTPressIn = () => {
    if (connectionState !== "connected") return;
    setIsPressing(true);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Manual long-press timer (more reliable than onLongPress on physical devices)
    longPressTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startPTTRecording();
    }, 400);
  };

  const handlePTTPressOut = () => {
    setIsPressing(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Cancel timer if not yet fired
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Stop recording if active
    if (isPTTActive) {
      stopPTTRecording();
    }
  };

  const getPTTButtonColor = (): string => {
    if (isPTTActive) return "bg-white shadow-red-200";
    if (isProcessing) return "bg-white shadow-orange-200";
    if (connectionState !== "connected") return "bg-gray-100 shadow-gray-200";
    return isPressing
      ? "bg-gray-50 shadow-blue-200"
      : "bg-white shadow-blue-200";
  };

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

  // Initialize Session (Once on mount, or re-init on focus/change)
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      // Security check: Only start session when screen is focused
      if (!isFocused) {
        Logger.info(TAG, "Screen not focused, skipping session init");
        return;
      }

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
          const levelGuide = LEVEL_GUIDANCE[selectedScenario.level] || LEVEL_GUIDANCE["S2"];
          instruction = `${buildRoleplayPrompt(targetLanguage, nativeLanguage)}

## Your Character
You are: ${selectedScenario.sophieRole}
Your personality and behavior: Fully embody this role. You have opinions, preferences, a backstory. React as this person would — not as a language tutor wearing a costume.

## The Scene
Scenario: ${selectedScenario.title}
The user is: ${selectedScenario.userRole}
Setting & situation: ${selectedScenario.context}
Topic: ${selectedScenario.topic}

## Language Difficulty — ${selectedScenario.level}
${levelGuide}

## Conversation Flow Guidelines
- Open the scene naturally — set the atmosphere with a small detail (a sound, an action, a greeting) before diving into dialogue
- Progress the conversation organically — don't just answer questions, introduce new elements: a complication, an interesting detail, a personal anecdote, a follow-up question
- Create moments of genuine interaction — humor, surprise, shared experiences, opinions
- If the conversation starts to stall, introduce a natural twist or new topic related to the scenario
- Build toward a satisfying conclusion — the conversation should feel like it had a beginning, middle, and end
- Remember what the user said earlier in the conversation and reference it naturally`;
          initialPrompt = `Set the scene and speak your opening line as ${selectedScenario.sophieRole}. Start with a small atmospheric detail or action, then greet the user naturally. Make it feel like the user just walked into this moment.`;
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
    isFocused, // Re-run on focus change
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
            <View className="flex-1 items-center justify-center">
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

      {/* Floating PTT Mic Button */}
      {canStartConversation && (
        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
          pointerEvents="box-none"
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              onPressIn={handlePTTPressIn}
              onPressOut={handlePTTPressOut}
            >
              <RainbowBorder
                borderRadius={9999}
                borderWidth={2.5}
                className="w-[72px] h-[72px]"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 8,
                }}
                containerClassName={`items-center justify-center ${getPTTButtonColor()}`}
              >
                <Feather
                  name="mic"
                  size={28}
                  color={isPTTActive ? "#ef4444" : "black"}
                />
              </RainbowBorder>
            </Pressable>
          </Animated.View>
        </View>
      )}

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
