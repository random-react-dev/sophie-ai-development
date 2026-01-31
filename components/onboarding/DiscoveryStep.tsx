import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DiscoveryStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const sources = [
    {
      id: "tiktok",
      title: t("onboarding.options.discovery.tiktok"),
      emoji: "🎵",
    },
    {
      id: "instagram",
      title: t("onboarding.options.discovery.instagram"),
      emoji: "📸",
    },
    {
      id: "linkedin",
      title: t("onboarding.options.discovery.linkedin"),
      emoji: "💼",
    },
    {
      id: "youtube",
      title: t("onboarding.options.discovery.youtube"),
      emoji: "🎬",
    },
    {
      id: "friend",
      title: t("onboarding.options.discovery.friend"),
      emoji: "👨‍👩‍👧‍",
    },
    {
      id: "other",
      title: t("onboarding.options.discovery.other"),
      emoji: "💬",
    },
  ];

  return (
    <View className="flex-1 px-4">
      {sources.map((source) => (
        <SelectionCard
          key={source.id}
          title={source.title}
          emoji={source.emoji}
          selected={data.discoverySource === source.id}
          onSelect={() => updateData({ discoverySource: source.id })}
        />
      ))}
    </View>
  );
};
