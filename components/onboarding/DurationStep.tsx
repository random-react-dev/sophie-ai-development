import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DurationStep = () => {
  const { data, updateData } = useOnboardingStore();

  const durations = [
    { id: "less_1_month", title: "Less than 1 month", level: 1 },
    { id: "less_6_months", title: "Less than 6 months", level: 2 },
    { id: "less_2_years", title: "Less than 2 years", level: 3 },
    { id: "less_5_years", title: "Less than 5 years", level: 4 },
    { id: "less_10_years", title: "Less than 10 years", level: 5 },
    { id: "more", title: "More", level: 6 },
  ];

  return (
    <View className="flex-1 px-4">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          How long have you been studying this language?
        </Text>
      </View>

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
