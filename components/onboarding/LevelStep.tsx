import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const LevelStep = () => {
  const { data, updateData } = useOnboardingStore();

  const levels = [
    {
      id: "zero",
      title: "I know not a single word",
      level: 1,
    },
    {
      id: "words",
      title: "I can only speak a few words",
      level: 2,
    },
    {
      id: "phrases",
      title: "I can only speak a few phrases",
      level: 3,
    },
    {
      id: "basic_idea",
      title: "I have the idea but not the vocabulary",
      level: 4,
    },
    {
      id: "fluent",
      title: "I am fluent, but need more practice",
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
