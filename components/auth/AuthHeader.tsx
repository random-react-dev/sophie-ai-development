import { RainbowWave } from "@/components/lesson/RainbowWave";
import React from "react";
import { Text, View } from "react-native";

export const AuthHeader = ({ className }: { className?: string }) => {
  return (
    <View className={`items-center ${className}`}>
      <View className="items-center justify-center mb-1">
        <RainbowWave
          isListening={false}
          isSpeaking={false}
          isProcessing={false}
          width={120}
          height={40}
          amplitudeScale={3.5}
          static={true}
        />
      </View>
      <Text className="text-3xl font-bold text-gray-900">Sophie AI</Text>
      <Text className="text-gray-500 w-full text-center mt-1">
        Your language personal assistant.
      </Text>
    </View>
  );
};
