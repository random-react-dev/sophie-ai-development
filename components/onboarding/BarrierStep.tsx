import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const BarrierStep = () => {
  const { data, updateData } = useOnboardingStore();

  const barriers = [
    {
      id: "mistakes",
      title: "Fear of making mistakes",
      emoji: "😰",
      description: "I worry about saying something wrong",
    },
    {
      id: "consistency",
      title: "Lack of consistency",
      emoji: "📅",
      description: "I struggle to practice regularly",
    },
    {
      id: "practice",
      title: "Lack of someone to practice with",
      emoji: "🗣️",
      description: "I don't have a conversation partner",
    },
    {
      id: "other",
      title: "Other",
      emoji: "💬",
      description: "Something else is holding me back",
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
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Why are you not confident?
        </Text>
      </View>

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
