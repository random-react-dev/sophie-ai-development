import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const FluencyStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const speeds = [
    {
      id: "norush",
      title: t("onboarding.options.fluency.norush"),
      level: 1,
    },
    {
      id: "consistent",
      title: t("onboarding.options.fluency.consistent"),
      level: 2,
    },
    {
      id: "phrases",
      title: t("onboarding.options.fluency.phrases"),
      level: 3,
    },
    {
      id: "conversations",
      title: t("onboarding.options.fluency.conversations"),
      level: 4,
    },
    {
      id: "desperate",
      title: t("onboarding.options.fluency.desperate"),
      level: 5,
    },
  ];

  return (
    <View className="flex-1 px-4">
      {speeds.map((speed) => (
        <SelectionCard
          key={speed.id}
          title={speed.title}
          dotLevel={speed.level}
          selected={data.fluencySpeed === speed.id}
          onSelect={() => updateData({ fluencySpeed: speed.id })}
        />
      ))}
    </View>
  );
};
