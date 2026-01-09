import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (lang: string) => void;
  selectedLang?: string;
}

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "es", name: "Spanish", native: "Español" },
];

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

// Animated Language Item Component
function LanguageItem({
  lang,
  isSelected,
  onPress,
}: {
  lang: { code: string; name: string; native: string };
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
          { borderWidth: 1.5, borderRadius: 20, padding: 18, marginBottom: 12 },
        ]}
        className="flex-row items-center justify-between"
      >
        <View>
          <Text
            className={`text-base font-bold ${
              isSelected ? "text-blue-500" : "text-gray-900"
            }`}
          >
            {lang.name}
          </Text>
          <Text className="text-gray-500 text-sm mt-0.5">{lang.native}</Text>
        </View>

        <AnimatedCheckbox isChecked={isSelected} />
      </Animated.View>
    </Pressable>
  );
}

export default function LanguagePicker({
  visible,
  onClose,
  onSelect,
  selectedLang,
}: LanguagePickerProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* Background overlay */}
      <View className="flex-1 bg-black/50 justify-end">
        {/* Bottom Sheet */}
        <View className="bg-white rounded-t-[32px] overflow-hidden">
          {/* Header */}
          <View className="px-6 py-5 border-b border-gray-100">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-gray-900">
                  App Language
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

          {/* Language List */}
          <View className="p-6 pb-12">
            {LANGUAGES.map((lang) => (
              <LanguageItem
                key={lang.code}
                lang={lang}
                isSelected={selectedLang === lang.code}
                onPress={() => onSelect(lang.code)}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
