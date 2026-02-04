import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const GoalStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const goals = [
    { id: "student", title: t("onboarding.options.goal.student"), emoji: "🎓" },
    {
      id: "traveler",
      title: t("onboarding.options.goal.traveler"),
      emoji: "✈️",
    },
    { id: "abroad", title: t("onboarding.options.goal.abroad"), emoji: "🌍" },
    { id: "job", title: t("onboarding.options.goal.job"), emoji: "💼" },
    { id: "other", title: t("onboarding.options.goal.other"), emoji: "💬" },
  ];

  return (
    <View className="flex-1 px-4">
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
