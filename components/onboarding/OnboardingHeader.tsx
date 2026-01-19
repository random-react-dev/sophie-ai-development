import React from "react";
import { Text, View } from "react-native";

interface OnboardingHeaderProps {
  title: string;
  subtitle?: string;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  title,
  subtitle,
}) => {
  return (
    <View className="mb-8 px-4">
      <Text className="text-3xl font-bold text-gray-900 mb-2">{title}</Text>
      {subtitle && (
        <Text className="text-gray-500 text-base leading-6">{subtitle}</Text>
      )}
    </View>
  );
};
