import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  Briefcase,
  Globe,
  GraduationCap,
  Plane,
  Plus,
} from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const GoalStep = () => {
  const { data, updateData } = useOnboardingStore();

  const goals = [
    { id: "student", title: "I am a student", icon: GraduationCap },
    { id: "traveler", title: "I am a traveler", icon: Plane },
    { id: "abroad", title: "I will / am abroad", icon: Globe },
    { id: "job", title: "I need it for my job", icon: Briefcase },
    { id: "other", title: "Other", icon: Plus },
  ];

  return (
    <View className="flex-1 px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          What&apos;s your main goal?
        </Text>
        <Text className="text-gray-500 text-base">
          We&apos;ll customize your practice content based on your goal.
        </Text>
      </View>

      {goals.map((goal) => (
        <SelectionCard
          key={goal.id}
          title={goal.title}
          icon={goal.icon}
          selected={data.mainGoal === goal.id}
          onSelect={() => updateData({ mainGoal: goal.id })}
        />
      ))}
    </View>
  );
};
