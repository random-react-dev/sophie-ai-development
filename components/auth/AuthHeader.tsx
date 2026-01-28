import React from "react";
import { Text, View } from "react-native";

export const AuthHeader = ({ className }: { className?: string }) => {
  return (
    <View className={`items-center mt-12 mb-8 ${className}`}>
      <Text className="text-3xl font-bold text-gray-900">Sophie AI</Text>
      <Text className="text-gray-500 text-base w-full text-center mt-2">
        Native speaker in your pocket
      </Text>
    </View>
  );
};
