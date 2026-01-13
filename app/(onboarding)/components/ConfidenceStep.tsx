import { useOnboardingStore } from "@/stores/onboardingStore";
import Slider from "@react-native-community/slider";
import React from "react";
import { Text, View } from "react-native";

export const ConfidenceStep = () => {
  const { data, updateData } = useOnboardingStore();

  const getEmoji = () => {
    switch (data.confidenceLevel) {
      case 1:
        return "😰";
      case 2:
        return "😕";
      case 3:
        return "😐";
      case 4:
        return "🙂";
      case 5:
        return "😎";
      default:
        return "";
    }
  };

  const getText = () => {
    switch (data.confidenceLevel) {
      case 1:
        return "Very nervous";
      case 2:
        return "A bit anxious";
      case 3:
        return "Neutral";
      case 4:
        return "Fairly confident";
      case 5:
        return "Very confident";
      default:
        return "";
    }
  };

  return (
    <View className="flex-1 px-6">
      <View className="mb-10">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          How confident are you?
        </Text>
        <Text className="text-gray-500 text-base">
          Don&apos;t worry, it&apos;s okay to start anywhere.
        </Text>
      </View>

      <View className="items-center justify-center p-8 bg-gray-50 rounded-3xl mb-8">
        <Text className="text-6xl mb-4">{getEmoji()}</Text>
        <Text className="text-xl font-bold text-gray-900">{getText()}</Text>
      </View>

      <View className="px-2">
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={data.confidenceLevel}
          onValueChange={(val) => updateData({ confidenceLevel: val })}
          minimumTrackTintColor="#3B82F6"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#3B82F6"
        />
        <View className="flex-row justify-between mt-2">
          <Text className="text-xs text-gray-400 font-medium">
            Very nervous
          </Text>
          <Text className="text-xs text-gray-400 font-medium">
            Very confident
          </Text>
        </View>
      </View>
    </View>
  );
};
