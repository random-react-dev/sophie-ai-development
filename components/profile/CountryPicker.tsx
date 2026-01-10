import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: string) => void;
  selectedCountry?: string;
}

const COUNTRIES = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "Brazil",
  "China",
  "Italy",
  "Spain",
  "Mexico",
  "Russia",
  "South Korea",
  "Indonesia",
  "Netherlands",
  "Turkey",
  "Saudi Arabia",
  "Switzerland",
].sort();

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Animated Checkbox with smooth "drawing" animation
function AnimatedCheckbox({ isChecked }: { isChecked: boolean }) {
  const progress = useSharedValue(isChecked ? 1 : 0);
  const pathLength = 22;

  useEffect(() => {
    progress.value = withTiming(isChecked ? 1 : 0, {
      duration: 300,
    });
  }, [isChecked]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: interpolate(progress.value, [0, 1], [pathLength, 0]),
    };
  });

  const bgAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["transparent", "#3b82f6"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#d1d5db", "#3b82f6"]
      ),
      borderWidth: 2,
    };
  });

  return (
    <Animated.View
      style={bgAnimatedStyle}
      className="w-6 h-6 rounded-full items-center justify-center shadow-sm"
    >
      <Svg width="14" height="14" viewBox="0 0 24 24">
        <AnimatedPath
          d="M5 12l5 5L20 7"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          animatedProps={animatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

// Animated Country Item Component
function CountryItem({
  country,
  isSelected,
  onPress,
}: {
  country: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isSelected ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#ffffff", "#f8fbff"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#e5e7eb", "#3b82f6"]
      ),
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          animatedStyle,
          { borderWidth: 1.5, borderRadius: 20, padding: 18 },
        ]}
        className="flex-row items-center justify-between"
      >
        <Text
          className={`text-base font-bold ${
            isSelected ? "text-blue-500" : "text-gray-900"
          }`}
        >
          {country}
        </Text>

        <AnimatedCheckbox isChecked={isSelected} />
      </Animated.View>
    </Pressable>
  );
}

export default function CountryPicker({
  visible,
  onClose,
  onSelect,
  selectedCountry,
}: CountryPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* Background overlay */}
      <View className="flex-1 bg-black/50">
        {/* Modal Content */}
        <SafeAreaView className="flex-1 bg-white mt-16 rounded-t-[32px] overflow-hidden">
          {/* Header */}
          <View className="px-4 py-6 bg-white border-b border-gray-100">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-gray-900">
                  Select Country
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={24} color="black" />
              </Pressable>
            </View>
          </View>

          {/* Country List */}
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <CountryItem
                country={item}
                isSelected={selectedCountry === item}
                onPress={() => onSelect(item)}
              />
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
