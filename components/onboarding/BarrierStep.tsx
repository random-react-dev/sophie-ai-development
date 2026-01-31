import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const BarrierStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const barriers = [
    {
      id: "mistakes",
      title: t("onboarding.options.barrier.mistakes.title"),
      emoji: "😰",
      description: t("onboarding.options.barrier.mistakes.desc"),
    },
    {
      id: "consistency",
      title: t("onboarding.options.barrier.consistency.title"),
      emoji: "📅",
      description: t("onboarding.options.barrier.consistency.desc"),
    },
    {
      id: "practice",
      title: t("onboarding.options.barrier.practice.title"),
      emoji: "🗣️",
      description: t("onboarding.options.barrier.practice.desc"),
    },
    {
      id: "other",
      title: t("onboarding.options.barrier.other.title"),
      emoji: "💬",
      description: t("onboarding.options.barrier.other.desc"),
    },
  ];

  const toggleBarrier = (id: string) => {
    const current = data.barriers;
    if (current.includes(id)) {
      updateData({ barriers: current.filter((b) => b !== id) });
    } else {
      updateData({ barriers: [...current, id] });
    }
  };

  return (
    <View className="flex-1 px-4">
      {barriers.map((barrier) => (
        <SelectionCard
          key={barrier.id}
          title={barrier.title}
          description={barrier.description}
          emoji={barrier.emoji}
          selected={data.barriers.includes(barrier.id)}
          onSelect={() => toggleBarrier(barrier.id)}
        />
      ))}
    </View>
  );
};
