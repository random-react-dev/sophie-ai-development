import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DiscoveryStep = () => {
  const { data, updateData } = useOnboardingStore();

  const sources = [
    { id: "youtube", title: "YouTube", emoji: "📺" },
    { id: "instagram", title: "Social Media", emoji: "📱" },
    { id: "search", title: "Search Engine", emoji: "🔍" },
    { id: "friend", title: "Friend or Colleague", emoji: "👥" },
    { id: "other", title: "Other", emoji: "💬" },
  ];

  return (
    <View className="flex-1 px-4">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          How did you find us?
        </Text>
        <Text className="text-gray-500 text-base">
          This helps us reach more learners like you.
        </Text>
      </View>

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
