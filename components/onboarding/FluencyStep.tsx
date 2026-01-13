import { useOnboardingStore } from "@/stores/onboardingStore";
import { Activity, Flame, Zap } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const FluencyStep = () => {
  const { data, updateData } = useOnboardingStore();

  const speeds = [
    {
      id: "casual",
      title: "Casual",
      description: "Take it slow and steady",
      icon: Zap,
    },
    {
      id: "regular",
      title: "Regular",
      description: "Standard learning pace",
      icon: Activity,
    },
    {
      id: "intense",
      title: "Intense",
      description: "Fast-track to fluency",
      icon: Flame,
    },
  ];

  return (
    <View className="flex-1 px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          How quickly do you want to become fluent?
        </Text>
        <Text className="text-gray-500 text-base">
          There&apos;s no right or wrong answer.
        </Text>
      </View>

      {speeds.map((speed) => (
        <SelectionCard
          key={speed.id}
          title={speed.title}
          description={speed.description}
          icon={speed.icon}
          selected={data.fluencySpeed === speed.id}
          onSelect={() => updateData({ fluencySpeed: speed.id })}
        />
      ))}
    </View>
  );
};
