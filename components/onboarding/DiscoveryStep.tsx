import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DiscoveryStep = () => {
  const { data, updateData } = useOnboardingStore();

  const sources = [
    { id: "tiktok", title: "TikTok", emoji: "🎵" },
    { id: "instagram", title: "Instagram", emoji: "📸" },
    { id: "linkedin", title: "LinkedIn", emoji: "💼" },
    { id: "youtube", title: "YouTube", emoji: "🎬" },
    { id: "friend", title: "Family/Friend", emoji: "👨‍👩‍👧‍" },
    { id: "other", title: "Other", emoji: "💬" },
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
