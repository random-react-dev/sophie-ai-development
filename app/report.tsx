import { RainbowBorder } from "@/components/common/Rainbow";
import { saveToVocabulary } from "@/services/supabase/vocabulary";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { useSessionReportsStore } from "@/stores/sessionReportsStore";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlignLeft,
  Bookmark,
  Clock,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getStringParam = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export default function ReportScreen() {
  const { messages, clearMessages } = useConversationStore();
  const { selectedScenario } = useScenarioStore();
  const { activeProfile } = useProfileStore();
  const { saveReport } = useSessionReportsStore();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [hasPersisted, setHasPersisted] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const fallbackSessionKeyRef = useRef(
    `report-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const isSavingReportRef = useRef(false);

  // Get duration from params or default to 0
  const durationParam = getStringParam(params.duration);
  const parsedDuration = durationParam ? parseInt(durationParam, 10) : 0;
  const durationSeconds = Number.isFinite(parsedDuration) ? parsedDuration : 0;
  const sessionKey =
    getStringParam(params.sessionKey) || fallbackSessionKeyRef.current;

  // Format duration for display (e.g., "2m 30s")
  const formattedDuration =
    durationSeconds < 60
      ? `${durationSeconds}s`
      : `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60 > 0 ? (durationSeconds % 60) + "s" : ""}`;

  useEffect(() => {
    let isMounted = true;

    const persistReport = async () => {
      if (hasPersisted || messages.length === 0 || isSavingReportRef.current) {
        return;
      }

      isSavingReportRef.current = true;
      if (isMounted) {
        setIsSavingReport(true);
        setSaveError(null);
      }

      try {
        const result = await saveReport({
          sessionKey,
          learningProfileId: activeProfile?.id ?? null,
          scenarioTitle: selectedScenario?.title ?? null,
          scenarioLevel: selectedScenario?.level ?? null,
          targetLanguage: activeProfile?.target_language ?? null,
          nativeLanguage:
            activeProfile?.medium_language || activeProfile?.native_language || null,
          durationSeconds,
          transcript: messages,
        });

        if (!isMounted) {
          return;
        }

        if (result.report) {
          setHasPersisted(true);
          return;
        }

        const errorMessage =
          "Failed to save session report. Please try again.";
        setSaveError(errorMessage);
        Alert.alert("Save failed", errorMessage);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Error persisting session report:", error);
        const errorMessage =
          "Failed to save session report. Please try again.";
        setSaveError(errorMessage);
        Alert.alert("Save failed", errorMessage);
      } finally {
        isSavingReportRef.current = false;
        if (isMounted) {
          setIsSavingReport(false);
        }
      }
    };

    void persistReport();

    return () => {
      isMounted = false;
      isSavingReportRef.current = false;
    };
  }, [
    activeProfile?.id,
    activeProfile?.medium_language,
    activeProfile?.native_language,
    activeProfile?.target_language,
    durationSeconds,
    hasPersisted,
    messages,
    saveReport,
    saveAttempt,
    selectedScenario?.level,
    selectedScenario?.title,
    sessionKey,
  ]);

  const handleRetrySave = () => {
    if (isSavingReport) {
      return;
    }

    setSaveAttempt((currentAttempt) => currentAttempt + 1);
  };

  const handleSave = async (text: string) => {
    const success = await saveToVocabulary({
      phrase: text,
      language: activeProfile?.target_language,
    });
    if (success) {
      Alert.alert("Saved", "Added to your vocabulary!");
    }
  };

  const handleClose = () => {
    clearMessages();
    router.replace("/(tabs)/talk" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header: Centered Title matching Profile Header style */}
      <View className="px-6 py-4 flex-row justify-center items-center relative border-b border-gray-50 bg-white z-10">
        <View className="items-center">
          <Text className="text-xl font-bold text-black">Session Report</Text>
          <Text className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-0.5">
            {selectedScenario?.title || "Conversation"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClose}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 absolute right-6"
        >
          <X size={20} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card with Rainbow Border */}
        <RainbowBorder
          borderRadius={32}
          borderWidth={2}
          className="mb-8"
          containerClassName="p-6 bg-white"
        >
          <View className="flex-row items-center gap-4 mb-4">
            <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center">
              <Sparkles size={24} color="#1f2937" />
            </View>
            <View>
              <Text className="text-gray-900 font-bold text-lg">
                Practice Summary
              </Text>
              <Text className="text-gray-500 text-xs font-medium uppercase tracking-widest">
                {selectedScenario?.level || "Intermediate"} Level
              </Text>
            </View>
          </View>
          <Text className="text-gray-600 text-base leading-relaxed">
            Great job! You successfully managed{" "}
            <Text className="font-bold text-gray-900">
              {messages.length} turns
            </Text>{" "}
            of conversation in this session. Keep practicing to improve your
            fluency and confidence!
          </Text>
        </RainbowBorder>

        {/* Statistics Row */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-gray-50 rounded-[24px] p-5 border border-gray-100 items-center">
            <MessageSquare size={20} color="#9ca3af" className="mb-2" />
            <Text className="text-2xl font-bold text-gray-900">
              {messages.length}
            </Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Messages
            </Text>
          </View>
          <View className="flex-1 bg-gray-50 rounded-[24px] p-5 border border-gray-100 items-center">
            <Clock size={20} color="#9ca3af" className="mb-2" />
            <Text className="text-2xl font-bold text-gray-900">
              {formattedDuration}
            </Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              Duration
            </Text>
          </View>
        </View>

        {/* Transcript Header */}
        <View className="flex-row items-center gap-2 mb-6 ml-1">
          <AlignLeft size={18} color="#9ca3af" />
          <Text className="text-gray-900 font-bold text-sm uppercase tracking-widest">
            Full Transcript
          </Text>
        </View>

        {/* Transcript List */}
        <View className="bg-gray-50/50 rounded-[32px] p-2">
          {messages.map((msg, index) => (
            <View
              key={msg.id}
              className={`p-4 rounded-2xl mb-2 ${msg.role === "user" ? "bg-white border border-gray-100" : "bg-transparent"}`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-2">
                  <View
                    className={`w-2 h-2 rounded-full ${msg.role === "user" ? "bg-gray-300" : "bg-black"}`}
                  />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {msg.role === "user" ? "You" : "Sophie AI"}
                  </Text>
                </View>
                {msg.role !== "user" && (
                  <TouchableOpacity onPress={() => handleSave(msg.text)}>
                    <Bookmark size={14} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              <Text
                className={`text-base leading-relaxed ${msg.role === "user" ? "text-gray-600" : "text-gray-900 font-medium"}`}
              >
                {msg.text}
              </Text>
            </View>
          ))}
        </View>

        <View className="h-28" />
      </ScrollView>

      {/* Bottom Action - Sticky Footer */}
      <View className="px-4 py-8 border-t border-gray-100 bg-white">
        {!hasPersisted && isSavingReport ? (
          <Text className="mb-4 text-center text-sm text-gray-500">
            Saving session report...
          </Text>
        ) : null}

        {saveError ? (
          <View className="mb-4 rounded-3xl border border-red-100 bg-red-50 p-4">
            <Text className="text-sm leading-6 text-red-700">{saveError}</Text>
            <TouchableOpacity
              onPress={handleRetrySave}
              disabled={isSavingReport}
              activeOpacity={0.7}
              className="mt-3 self-start rounded-full bg-red-600 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">
                Retry save
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          className="w-full h-16 rounded-full overflow-hidden shadow-lg"
        >
          <RainbowBorder
            borderRadius={9999}
            borderWidth={2}
            className="flex-1"
            containerClassName="items-center justify-center flex-1"
          >
            <Text className="text-black font-bold text-lg">
              Session Finished
            </Text>
          </RainbowBorder>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
