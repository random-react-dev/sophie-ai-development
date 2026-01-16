import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const GoalStep = () => {
  const { data, updateData } = useOnboardingStore();

  const goals = [
    { id: "student", title: "I am a student", emoji: "🎓" },
    { id: "traveler", title: "I am a traveler", emoji: "✈️" },
    { id: "abroad", title: "I will / am abroad", emoji: "🌍" },
    { id: "job", title: "I need it for my job", emoji: "💼" },
    { id: "other", title: "Other", emoji: "✨" },
  ];

  return (
    <View className="flex-1 px-4">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          What&apos;s your main goal in life?
        </Text>
        <Text className="text-gray-500 text-base">
          We&apos;ll customize your practice content based on your goal.
        </Text>
      </View>

      {goals.map((goal) => (
        <SelectionCard
          key={goal.id}
          title={goal.title}
          emoji={goal.emoji}
          selected={data.mainGoal === goal.id}
          onSelect={() => updateData({ mainGoal: goal.id })}
        />
      ))}
    </View>
  );
};
