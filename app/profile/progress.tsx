import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useStatsStore } from "@/stores/statsStore";
import { useVocabularyStore } from "@/stores/vocabularyStore";
import { useFocusEffect } from "@react-navigation/native";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react-native";
import React, { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgressScreen() {
  const { totalSpeakingSeconds, totalConversations, fetchStats } =
    useStatsStore();
  const { items: vocabularyItems, fetchVocabulary } = useVocabularyStore();
  const { t } = useTranslation();

  // Refresh stats when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      // We also fetch vocabulary to update words learned count if needed
      // though it might already be up to date from vocabulary store logic
      if (vocabularyItems.length === 0) {
        fetchVocabulary();
      }
    }, [fetchStats, fetchVocabulary, vocabularyItems.length]),
  );

  // Format speaking time
  const formatSpeakingTime = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    if (totalSeconds < 3600) return `${Math.floor(totalSeconds / 60)}m`;
    return `${(totalSeconds / 3600).toFixed(1)}h`;
  };

  // Calculate words learned (total vocabulary items)
  const wordsLearned = vocabularyItems.length;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.progress_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-green-50 items-center justify-center mb-4">
                            <BarChart3 size={32} color="#22c55e" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Progress</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Track your learning journey
                        </Text>
                    </View>
                </View> */}

        {/* Stats Preview */}
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.progress_screen.overview")}
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between">
              <View className="flex-1 items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-2">
                  <Clock size={20} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {formatSpeakingTime(totalSpeakingSeconds)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 w-full text-center">
                  {t("profile.progress_screen.speaking")}
                </Text>
              </View>

              <View className="w-px bg-gray-100" />

              <View className="flex-1 items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center mb-2">
                  <BookOpen size={20} color="#22c55e" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {wordsLearned}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 w-full text-center">
                  {t("profile.progress_screen.words")}
                </Text>
              </View>

              <View className="w-px bg-gray-100" />

              <View className="flex-1 items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mb-2">
                  <Target size={20} color="#f59e0b" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {totalConversations}
                </Text>
                <Text className="text-xs text-gray-500 mt-1 w-full text-center">
                  {t("profile.progress_screen.sessions")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Coming Soon */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.progress_screen.detailed_stats")}
          </Text>

          <View className="bg-surface rounded-2xl p-6 shadow-sm items-center">
            <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mb-3">
              <TrendingUp size={24} color="#9ca3af" />
            </View>
            <Text className="text-base font-semibold text-gray-900 mb-1">
              {t("profile.progress_screen.coming_soon")}
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              {t("profile.progress_screen.coming_soon_body")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
