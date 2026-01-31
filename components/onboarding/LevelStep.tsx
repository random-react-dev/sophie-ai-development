import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const LevelStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const levels = [
    {
      id: "zero",
      title: t("onboarding.options.level.zero"),
      level: 1,
    },
    {
      id: "words",
      title: t("onboarding.options.level.words"),
      level: 2,
    },
    {
      id: "phrases",
      title: t("onboarding.options.level.phrases"),
      level: 3,
    },
    {
      id: "basic_idea",
      title: t("onboarding.options.level.basic_idea"),
      level: 4,
    },
    {
      id: "fluent",
      title: t("onboarding.options.level.fluent"),
      level: 5,
    },
  ];

  return (
    <View className="flex-1 px-4">
      {levels.map((level) => (
        <SelectionCard
          key={level.id}
          title={level.title}
          proficiencyLevel={level.level}
          selected={data.speakingLevel === level.id}
          onSelect={() => updateData({ speakingLevel: level.id })}
        />
      ))}
    </View>
  );
};
