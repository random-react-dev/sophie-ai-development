import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const BarrierStep = () => {
  const { data, updateData } = useOnboardingStore();

  const barriers = [
    { id: "mistakes", title: "Fear of making mistakes" },
    { id: "consistency", title: "Lack of consistency" },
    { id: "practice", title: "Lack of someone to practice with" },
    { id: "other", title: "Other" },
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
    <View className="flex-1 px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          What&apos;s holding you back?
        </Text>
        <Text className="text-gray-500 text-base">
          It helps us tailor your experience.
        </Text>
      </View>

      {barriers.map((barrier) => (
        <SelectionCard
          key={barrier.id}
          title={barrier.title}
          selected={data.barriers.includes(barrier.id)}
          onSelect={() => toggleBarrier(barrier.id)}
        />
      ))}
    </View>
  );
};
