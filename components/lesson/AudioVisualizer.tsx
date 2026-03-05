import { useVolumeLevel } from "@/stores/conversationStore";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface AudioVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export function AudioVisualizer({
  isListening,
  isSpeaking,
}: AudioVisualizerProps) {
  const volumeLevel = useVolumeLevel();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSpeaking) {
      // Pulse animation when AI is speaking
      scale.value = withRepeat(
        withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else if (isListening) {
      // React to volume level when user is speaking
      // Scale based on volume, clamped
      const targetScale = 1 + Math.min(volumeLevel, 0.5);
      scale.value = withTiming(targetScale, { duration: 100 });
    } else {
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [isSpeaking, isListening, volumeLevel, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="items-center justify-center h-40">
      <Animated.View
        className={`w-32 h-32 rounded-full items-center justify-center ${isSpeaking ? "bg-green-400" : isListening ? "bg-blue-500" : "bg-gray-300"}`}
        style={animatedStyle}
      >
        <View className="w-28 h-28 bg-white/20 rounded-full" />
      </Animated.View>
    </View>
  );
}
