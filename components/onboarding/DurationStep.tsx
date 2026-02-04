import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DurationStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const durations = [
    {
      id: "less_1_month",
      title: t("onboarding.options.duration.less_1_month"),
      level: 1,
    },
    {
      id: "less_6_months",
      title: t("onboarding.options.duration.less_6_months"),
      level: 2,
    },
    {
      id: "less_2_years",
      title: t("onboarding.options.duration.less_2_years"),
      level: 3,
    },
    {
      id: "less_5_years",
      title: t("onboarding.options.duration.less_5_years"),
      level: 4,
    },
    {
      id: "less_10_years",
      title: t("onboarding.options.duration.less_10_years"),
      level: 5,
    },
    { id: "more", title: t("onboarding.options.duration.more"), level: 6 },
  ];

  return (
    <View className="flex-1 px-4">
      {durations.map((duration) => (
        <SelectionCard
          key={duration.id}
          title={duration.title}
          durationLevel={duration.level}
          selected={data.learningDuration === duration.id}
          onSelect={() => updateData({ learningDuration: duration.id })}
        />
      ))}
    </View>
  );
};
