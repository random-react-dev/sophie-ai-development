import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { CustomSlider } from "./CustomSlider";

export const ConfidenceStep = () => {
  const { data, updateData } = useOnboardingStore();

  const confidenceMap: Record<number, { emoji: string; label: string }> = {
    1: { emoji: "😖", label: "Terrified" },
    2: { emoji: "😰", label: "Very Nervous" },
    3: { emoji: "😟", label: "Anxious" },
    4: { emoji: "😕", label: "Unsure" },
    5: { emoji: "😐", label: "Neutral" },
    6: { emoji: "🙂", label: "Hopeful" },
    7: { emoji: "😃", label: "Confident" },
    8: { emoji: "😎", label: "Unstoppable" },
  };

  const currentLevel = data.confidenceLevel || 3;
  const { emoji, label } = confidenceMap[currentLevel] || confidenceMap[3];

  return (
    <View className=" px-4 justify-center">
      <View className="mb-16">
        <Text className="text-3xl font-bold text-gray-900 mb-4">
          How confident are you?
        </Text>

        {/* Dynamic Label that updates with slider */}
        <Text className="text-xl font-bold text-blue-600">{label}</Text>
      </View>

      <View className="px-2">
        {/* Custom Premium Slider with Emoji Thumb */}
        <CustomSlider
          min={1}
          max={8}
          step={1}
          value={currentLevel}
          onValueChange={(val) => updateData({ confidenceLevel: val })}
          emoji={emoji} // Pass current emoji to render inside thumb
        />

        <View className="flex-row justify-between mt-4 px-2">
          <Text className="text-sm text-gray-400 font-medium">Terrified</Text>
          <Text className="text-sm text-gray-400 font-medium">Unstoppable</Text>
        </View>
      </View>
    </View>
  );
};
