import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export const FocusStep = () => {
  const { data, updateData } = useOnboardingStore();

  const areas = [
    "Listening",
    "Speaking",
    "Pronunciation",
    "Vocabulary",
    "Grammar",
    "Reading",
    "Writing",
  ];

  const toggleArea = (area: string) => {
    const current = data.focusAreas;
    if (current.includes(area)) {
      updateData({ focusAreas: current.filter((a) => a !== area) });
    } else if (current.length < 3) {
      updateData({ focusAreas: [...current, area] });
    }
  };

  return (
    <View className="flex-1 px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          What do you want to focus on?
        </Text>
        <Text className="text-gray-500 text-base">
          Select up to 3 priority areas for your initial sessions.
        </Text>
      </View>

      <View className="flex-row flex-wrap">
        {areas.map((area) => {
          const isSelected = data.focusAreas.includes(area);
          return (
            <TouchableOpacity
              key={area}
              onPress={() => toggleArea(area)}
              activeOpacity={0.7}
              className={`mr-3 mb-4 px-6 py-4 rounded-full border ${
                isSelected
                  ? "bg-blue-500 border-blue-500"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`text-base font-bold ${
                  isSelected ? "text-white" : "text-gray-700"
                }`}
              >
                {area}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
