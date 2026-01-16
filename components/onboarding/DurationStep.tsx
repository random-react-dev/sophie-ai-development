import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DurationStep = () => {
  const { data, updateData } = useOnboardingStore();

  const durations = [
    { id: "zero", title: "I am just starting", emoji: "🕐" },
    { id: "months", title: "For a few months", emoji: "📅" },
    { id: "yearplus", title: "For over a year", emoji: "📆" },
    { id: "offon", title: "On and off for years", emoji: "⏳" },
  ];

  return (
    <View className="flex-1 px-4">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          How long have you been studying?
        </Text>
        <Text className="text-gray-500 text-base">
          Knowing your history helps us set the right pace.
        </Text>
      </View>

      {durations.map((duration) => (
        <SelectionCard
          key={duration.id}
          title={duration.title}
          emoji={duration.emoji}
          selected={data.learningDuration === duration.id}
          onSelect={() => updateData({ learningDuration: duration.id })}
        />
      ))}
    </View>
  );
};
