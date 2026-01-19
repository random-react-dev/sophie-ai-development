import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const FluencyStep = () => {
  const { data, updateData } = useOnboardingStore();

  const speeds = [
    {
      id: "norush",
      title: "No rush, I can take my time",
      level: 1,
    },
    {
      id: "consistent",
      title: "I want to be consistent and practice daily",
      level: 2,
    },
    {
      id: "phrases",
      title: "I just need a couple of phrases",
      level: 3,
    },
    {
      id: "conversations",
      title: "I need to have general conversations",
      level: 4,
    },
    {
      id: "desperate",
      title: "I am desperate to be fluent, now.",
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
