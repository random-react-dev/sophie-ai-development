import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

interface ThemeCardProps {
  theme: "light" | "dark";
  isSelected: boolean;
  onSelect: () => void;
}

export default function ThemeCard({
  theme,
  isSelected,
  onSelect,
}: ThemeCardProps) {
  // Animated value for radio button scale
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1 : 0,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [isSelected, scaleAnim]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  const isLight = theme === "light";

  return (
    <Pressable
      onPress={handlePress}
      className="flex-1 items-center"
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {/* Theme Preview Card */}
      <View
        className={`w-24 h-16 rounded-xl mb-3 items-center justify-center ${
          isLight ? "bg-gray-100 dark:bg-gray-700" : "bg-gray-800 dark:bg-black"
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Preview Lines */}
        <View className="w-14 gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <View
              className={`w-2 h-2 rounded-full ${
                isLight ? "bg-blue-500" : "bg-blue-400"
              }`}
            />
            <View
              className={`flex-1 h-2 rounded-full ${
                isLight ? "bg-gray-300 dark:bg-gray-500" : "bg-gray-600 dark:bg-gray-800"
              }`}
            />
          </View>
          <View className="flex-row items-center gap-1.5">
            <View
              className={`w-2 h-2 rounded-full ${
                isLight ? "bg-blue-500" : "bg-blue-400"
              }`}
            />
            <View
              className={`flex-1 h-2 rounded-full ${
                isLight ? "bg-gray-300 dark:bg-gray-500" : "bg-gray-600 dark:bg-gray-800"
              }`}
            />
          </View>
        </View>
      </View>

      {/* Theme Label */}
      <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
        {isLight ? "Light" : "Dark"}
      </Text>

      {/* Animated Radio Button */}
      <View
        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          isSelected ? "border-blue-500" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <Animated.View
          className="w-3.5 h-3.5 rounded-full bg-blue-500"
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: scaleAnim,
          }}
        />
      </View>
    </Pressable>
  );
}
