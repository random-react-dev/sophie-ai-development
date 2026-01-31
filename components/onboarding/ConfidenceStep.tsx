import { Colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";
import { CustomSlider } from "./CustomSlider";

export const ConfidenceStep = () => {
  const { data, updateData } = useOnboardingStore();
  const { t } = useTranslation();

  const confidenceMap: Record<number, { emoji: string; label: string }> = {
    1: { emoji: "😖", label: t("onboarding.options.confidence.1") },
    2: { emoji: "😰", label: t("onboarding.options.confidence.2") },
    3: { emoji: "😟", label: t("onboarding.options.confidence.3") },
    4: { emoji: "😕", label: t("onboarding.options.confidence.4") },
    5: { emoji: "😐", label: t("onboarding.options.confidence.5") },
    6: { emoji: "🙂", label: t("onboarding.options.confidence.6") },
    7: { emoji: "😃", label: t("onboarding.options.confidence.7") },
    8: { emoji: "😎", label: t("onboarding.options.confidence.8") },
  };

  const currentLevel = data.confidenceLevel || 3;
  const { label } = confidenceMap[currentLevel] || confidenceMap[3];

  // Calculate the rainbow color based on confidence level (1-8)
  const rainbow = Colors.rainbow;
  const percentage = (currentLevel - 1) / 7; // 1-8 range, so 7 steps
  const colorIndex = Math.round(percentage * (rainbow.length - 1));
  const labelColor = rainbow[colorIndex] || rainbow[0];

  return (
    <View className="px-4 justify-center">
      <View className="px-2">
        {/* Dynamic Label with Rainbow Color based on slider position */}
        <Text
          className="text-2xl text-center font-bold mb-2"
          style={{ color: labelColor }}
        >
          {label}
        </Text>

        {/* Custom Premium Slider with Rainbow Gradient Thumb */}
        <CustomSlider
          min={1}
          max={8}
          step={1}
          value={currentLevel}
          onValueChange={(val) => updateData({ confidenceLevel: val })}
        />

        <View className="flex-row justify-between mt-4 px-2">
          <Text className="text-sm text-gray-400 font-medium">
            {t("onboarding.options.confidence.1")}
          </Text>
          <Text className="text-sm text-gray-400 font-medium">
            {t("onboarding.options.confidence.8")}
          </Text>
        </View>
      </View>
    </View>
  );
};
