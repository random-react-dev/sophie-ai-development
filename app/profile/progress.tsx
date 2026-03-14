import { RainbowBorder } from "@/components/common/Rainbow";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { SessionReport } from "@/services/supabase/sessionReports";
import { useSessionReportsStore } from "@/stores/sessionReportsStore";
import { useStatsStore } from "@/stores/statsStore";
import { useVocabularyStore } from "@/stores/vocabularyStore";
import { useFocusEffect } from "@react-navigation/native";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Languages,
  MessageSquare,
  Target,
  TrendingUp,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AccentPalette {
  tint: string;
  soft: string;
  strong: string;
  iconBg: string;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  palette: AccentPalette;
}

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  message: string;
}

const DAYS_IN_SUMMARY = 7;
const TRANSCRIPT_PREVIEW_COUNT = 2;

const SUMMARY_PALETTES: AccentPalette[] = [
  {
    tint: "#2563eb",
    soft: "#dbeafe",
    strong: "#1d4ed8",
    iconBg: "#eff6ff",
  },
  {
    tint: "#059669",
    soft: "#d1fae5",
    strong: "#047857",
    iconBg: "#ecfdf5",
  },
  {
    tint: "#d97706",
    soft: "#ffedd5",
    strong: "#b45309",
    iconBg: "#fff7ed",
  },
];

const SESSION_PALETTES: AccentPalette[] = [
  {
    tint: "#2563eb",
    soft: "#eff6ff",
    strong: "#1d4ed8",
    iconBg: "#dbeafe",
  },
  {
    tint: "#10b981",
    soft: "#ecfdf5",
    strong: "#047857",
    iconBg: "#d1fae5",
  },
  {
    tint: "#f59e0b",
    soft: "#fffbeb",
    strong: "#b45309",
    iconBg: "#fef3c7",
  },
  {
    tint: "#8b5cf6",
    soft: "#f5f3ff",
    strong: "#6d28d9",
    iconBg: "#ede9fe",
  },
];

const formatSpeakingTime = (totalSeconds: number) => {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  if (totalSeconds < 3600) return `${Math.floor(totalSeconds / 60)}m`;
  return `${(totalSeconds / 3600).toFixed(1)}h`;
};

const formatSessionDuration = (totalSeconds: number) => {
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
};

const formatSessionDate = (completedAt: string) => {
  const date = new Date(completedAt);

  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} | ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const formatShortDate = (completedAt: string) =>
  new Date(completedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const getTopLanguage = (reports: SessionReport[]) => {
  const counts = new Map<string, number>();

  reports.forEach((report) => {
    if (!report.target_language) {
      return;
    }

    counts.set(
      report.target_language,
      (counts.get(report.target_language) ?? 0) + 1,
    );
  });

  let topLanguage = "";
  let topCount = 0;

  counts.forEach((count, language) => {
    if (count > topCount) {
      topLanguage = language;
      topCount = count;
    }
  });

  return topLanguage;
};

const getRecentSummary = (reports: SessionReport[]) => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (DAYS_IN_SUMMARY - 1));

  const activeDays = new Set<string>();
  let sessionCount = 0;

  reports.forEach((report) => {
    const completedAt = new Date(report.completed_at);

    if (completedAt < cutoff) {
      return;
    }

    sessionCount += 1;
    activeDays.add(completedAt.toDateString());
  });

  return {
    activeDays: activeDays.size,
    sessionCount,
  };
};

const countTranscriptMessages = (
  transcript: SessionReport["transcript"],
  role: "user" | "model",
) => transcript.filter((message) => message.role === role).length;

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4">
      <Text className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">
        {eyebrow}
      </Text>
      <Text className="mt-2 text-2xl font-bold text-gray-900">{title}</Text>
      <Text className="mt-1 text-sm leading-6 text-gray-500">{subtitle}</Text>
    </View>
  );
}

function SummaryCard({ icon, label, value, palette }: SummaryCardProps) {
  return (
    <View
      className="flex-1 rounded-2xl border p-4"
      style={{
        backgroundColor: palette.soft,
        borderColor: palette.iconBg,
      }}
    >
      <View
        className="mb-3 h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: palette.iconBg }}
      >
        {icon}
      </View>
      <Text className="text-xl font-bold" style={{ color: palette.strong }}>
        {value}
      </Text>
      <Text
        className="mt-1 text-xs font-semibold uppercase tracking-wide"
        style={{ color: palette.tint }}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyStateCard({ icon, title, message }: EmptyStateCardProps) {
  return (
    <View className="items-center rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        {icon}
      </View>
      <Text className="text-base font-semibold text-gray-900">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-gray-500">
        {message}
      </Text>
    </View>
  );
}

export default function ProgressScreen() {
  const { totalSpeakingSeconds, totalConversations, fetchStats } =
    useStatsStore();
  const { items: vocabularyItems, fetchVocabulary } = useVocabularyStore();
  const {
    items: sessionReports,
    isLoading: sessionReportsLoading,
    fetchReports,
  } = useSessionReportsStore();
  const { t } = useTranslation();
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, boolean>
  >({});

  useFocusEffect(
    useCallback(() => {
      void fetchStats();
      void fetchVocabulary();
      void fetchReports();
    }, [fetchReports, fetchStats, fetchVocabulary]),
  );

  const wordsLearned = vocabularyItems.length;
  const trackedSessions = Math.max(totalConversations, sessionReports.length);
  const averageSessionSeconds =
    trackedSessions > 0 ? Math.round(totalSpeakingSeconds / trackedSessions) : 0;
  const latestReport = sessionReports[0] ?? null;
  const focusLanguage = getTopLanguage(sessionReports);
  const recentSummary = getRecentSummary(sessionReports);

  const overviewSubtitle =
    trackedSessions === 0
      ? "Finish a Talk session to start building your progress."
      : latestReport
        ? `Last session saved on ${formatShortDate(latestReport.completed_at)}.`
        : "Your finished Talk sessions will appear here.";

  const toggleSessionExpanded = useCallback((sessionId: string) => {
    setExpandedSessions((current) => ({
      ...current,
      [sessionId]: !current[sessionId],
    }));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <ProfileHeader title={t("profile.progress_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-2">
          <SectionHeader
            eyebrow={t("profile.progress_screen.overview")}
            title="Your speaking progress"
            subtitle="Simple layout, better color, and a clearer reading order."
          />

          <RainbowBorder
            borderRadius={28}
            className="rounded-3xl shadow-sm"
            containerClassName="overflow-hidden"
            innerBackgroundClassName="bg-white"
          >
            <View className="p-5">
              <View className="rounded-3xl bg-slate-900 px-5 py-5">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <View className="self-start rounded-full bg-white/15 px-3 py-1.5">
                      <Text className="text-xs font-bold uppercase tracking-wider text-white">
                        Total speaking time
                      </Text>
                    </View>

                    <Text className="mt-4 text-4xl font-black text-white">
                      {formatSpeakingTime(totalSpeakingSeconds)}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-300">
                      {overviewSubtitle}
                    </Text>
                  </View>

                  <View className="h-14 w-14 items-center justify-center rounded-3xl bg-white/15">
                    <TrendingUp size={24} color="#ffffff" />
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <SummaryCard
                  icon={<Target size={18} color={SUMMARY_PALETTES[0].tint} />}
                  label={t("profile.progress_screen.sessions")}
                  value={String(trackedSessions)}
                  palette={SUMMARY_PALETTES[0]}
                />
                <SummaryCard
                  icon={<BookOpen size={18} color={SUMMARY_PALETTES[1].tint} />}
                  label={t("profile.progress_screen.words")}
                  value={String(wordsLearned)}
                  palette={SUMMARY_PALETTES[1]}
                />
                <SummaryCard
                  icon={<Clock size={18} color={SUMMARY_PALETTES[2].tint} />}
                  label="Avg"
                  value={
                    averageSessionSeconds > 0
                      ? formatSessionDuration(averageSessionSeconds)
                      : "--"
                  }
                  palette={SUMMARY_PALETTES[2]}
                />
              </View>
            </View>
          </RainbowBorder>
        </View>

        <View className="mx-4 mt-5">
          <View className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900">
              This week
            </Text>

            <View className="mt-4 gap-3">
              <View className="flex-row items-center justify-between rounded-2xl bg-blue-50 px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">
                    <TrendingUp size={18} color="#2563eb" />
                  </View>
                  <Text className="text-sm font-medium text-blue-900">
                    Sessions saved
                  </Text>
                </View>
                <Text className="text-base font-semibold text-blue-900">
                  {recentSummary.sessionCount}
                </Text>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">
                    <CalendarDays size={18} color="#059669" />
                  </View>
                  <Text className="text-sm font-medium text-emerald-900">
                    Active days
                  </Text>
                </View>
                <Text className="text-base font-semibold text-emerald-900">
                  {recentSummary.activeDays}/{DAYS_IN_SUMMARY}
                </Text>
              </View>

              <View className="flex-row items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white">
                    <Languages size={18} color="#d97706" />
                  </View>
                  <Text className="text-sm font-medium text-amber-900">
                    Focus language
                  </Text>
                </View>
                <Text
                  className="max-w-[45%] text-right text-base font-semibold text-amber-900"
                  numberOfLines={1}
                >
                  {focusLanguage || "Not enough data"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-4 mt-6">
          <SectionHeader
            eyebrow={t("profile.progress_screen.detailed_stats")}
            title="Saved conversations"
            subtitle="Open any session to read the transcript."
          />

          {sessionReportsLoading && sessionReports.length === 0 ? (
            <EmptyStateCard
              icon={<TrendingUp size={24} color="#9ca3af" />}
              title="Loading session history..."
              message="Pulling your saved Talk sessions."
            />
          ) : sessionReports.length === 0 ? (
            <EmptyStateCard
              icon={<MessageSquare size={24} color="#9ca3af" />}
              title="No finished Talk sessions yet"
              message="Completed conversations will appear here after you tap Finish & Get Reports."
            />
          ) : (
            <View className="gap-4">
              {sessionReports.map((report, index) => {
                const isExpanded = !!expandedSessions[report.id];
                const visibleTranscript = isExpanded
                  ? report.transcript
                  : report.transcript.slice(0, TRANSCRIPT_PREVIEW_COUNT);
                const palette =
                  SESSION_PALETTES[index % SESSION_PALETTES.length];
                const hiddenMessages = Math.max(
                  report.transcript.length - visibleTranscript.length,
                  0,
                );
                const userMessages = countTranscriptMessages(
                  report.transcript,
                  "user",
                );
                const modelMessages = countTranscriptMessages(
                  report.transcript,
                  "model",
                );

                return (
                  <View
                    key={report.id}
                    className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                  >
                    <View
                      className="h-1.5 w-full"
                      style={{ backgroundColor: palette.tint }}
                    />

                    <View className="p-5">
                      <Text className="text-lg font-semibold text-gray-900">
                        {report.scenario_title || "Conversation with Sophie AI"}
                      </Text>

                      <Text className="mt-1 text-sm text-gray-500">
                        {formatSessionDate(report.completed_at)}
                      </Text>

                      <View
                        className="mt-4 rounded-2xl p-4"
                        style={{ backgroundColor: palette.soft }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: palette.strong }}
                        >
                          {formatSessionDuration(report.duration_seconds)} |{" "}
                          {report.message_count} messages
                          {report.target_language
                            ? ` | ${report.target_language}`
                            : ""}
                        </Text>
                      </View>

                      <View className="mt-4 gap-3">
                        {visibleTranscript.length === 0 ? (
                          <View className="rounded-2xl bg-slate-50 px-4 py-4">
                            <Text className="text-sm text-gray-500">
                              No transcript messages were saved for this session.
                            </Text>
                          </View>
                        ) : (
                          visibleTranscript.map((message) => (
                            <View
                              key={message.id}
                              className={`rounded-2xl px-4 py-3 ${
                                message.role === "user"
                                  ? "border border-gray-200 bg-white"
                                  : ""
                              }`}
                              style={
                                message.role === "user"
                                  ? undefined
                                  : { backgroundColor: palette.soft }
                              }
                            >
                              <Text
                                className="mb-1 text-xs font-bold uppercase tracking-wide"
                                style={{
                                  color:
                                    message.role === "user"
                                      ? "#9ca3af"
                                      : palette.tint,
                                }}
                              >
                                {message.role === "user" ? "You" : "Sophie AI"}
                              </Text>
                              <Text
                                className={`text-sm leading-6 ${
                                  message.role === "user"
                                    ? "text-gray-700"
                                    : "text-gray-900"
                                }`}
                              >
                                {message.text}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>

                      {hiddenMessages > 0 && !isExpanded ? (
                        <Text
                          className="mt-3 text-xs font-semibold"
                          style={{ color: palette.tint }}
                        >
                          +{hiddenMessages} more messages
                        </Text>
                      ) : null}

                      <View className="mt-4 flex-row items-center justify-end border-t border-gray-100 pt-4">
                        {/* <Text className="flex-1 text-xs text-gray-500">
                          {userMessages} from you | {modelMessages} from Sophie
                        </Text> */}

                        <TouchableOpacity
                          activeOpacity={0.8}
                          className="flex-row items-center gap-2 rounded-full px-4 py-2"
                          style={{ backgroundColor: palette.iconBg }}
                          onPress={() => toggleSessionExpanded(report.id)}
                        >
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: palette.strong }}
                          >
                            {isExpanded ? "Show less" : "View transcript"}
                          </Text>
                          {isExpanded ? (
                            <ChevronUp size={16} color={palette.strong} />
                          ) : (
                            <ChevronDown size={16} color={palette.strong} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
