import { useOnboardingStore } from "@/stores/onboardingStore";
import { Baby, User, UserCheck } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const LevelStep = () => {
  const { data, updateData } = useOnboardingStore();

  const levels = [
    {
      id: "beginner",
      title: "Beginner",
      description: "I can say hello and basic phrases",
      icon: Baby,
    },
    {
      id: "intermediate",
      title: "Intermediate",
      description: "I can have simple conversations",
      icon: User,
    },
    {
      id: "advanced",
      title: "Advanced",
      description: "I can speak comfortably about most topics",
      icon: UserCheck,
    },
  ];

  return (
    <View className="flex-1 px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          What&apos;s your speaking level?
        </Text>
        <Text className="text-gray-500 text-base">
          Don&apos;t worry, you can always change this later.
        </Text>
      </View>

      {levels.map((level) => (
        <SelectionCard
          key={level.id}
          title={level.title}
          description={level.description}
          icon={level.icon}
          selected={data.speakingLevel === level.id}
          onSelect={() => updateData({ speakingLevel: level.id })}
        />
      ))}
    </View>
  );
};
