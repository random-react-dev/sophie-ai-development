import CircleFlag from "@/components/common/CircleFlag";
import { Language, SUPPORTED_LANGUAGES } from "@/constants/languages";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
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

// Animated Language Item Card
function AnimatedLanguageItem({
  item,
  isSelected,
  onPress,
}: {
  item: Language;
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
      shadowColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#000000", "#3b82f6"]
      ),
      shadowOpacity: interpolate(progress.value, [0, 1], [0.05, 0.08]),
      shadowRadius: interpolate(progress.value, [0, 1], [4, 8]),
      elevation: interpolate(progress.value, [0, 1], [1, 2]),
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          animatedStyle,
          { borderWidth: 1.5, borderRadius: 20, padding: 16 },
        ]}
        className="flex-row items-center"
      >
        <CircleFlag countryCode={item.countryCode} size={40} />
        <View className="flex-1 ml-4">
          <Text
            className={`font-bold text-base ${
              isSelected ? "text-blue-500" : "text-gray-900"
            }`}
          >
            {item.name}
          </Text>
          <Text className="text-gray-500 text-sm">{item.nativeName}</Text>
        </View>
        <AnimatedCheckbox isChecked={isSelected} />
      </Animated.View>
    </Pressable>
  );
}

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (language: Language) => void;
  selectedCode?: string;
  title?: string;
}

export default function LanguagePickerModal({
  visible,
  onClose,
  onSelect,
  selectedCode,
  title = "Select Language",
}: LanguagePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return SUPPORTED_LANGUAGES;

    const query = searchQuery.toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (language: Language) => {
    onSelect(language);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-white"
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="text-2xl font-bold text-black">{title}</Text>
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
            >
              <Ionicons name="close" size={24} color="black" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="p-4">
            <View className="h-12 shadow-lg rounded-full flex-row items-center px-4 bg-gray-100">
              <Feather name="search" size={20} color="gray" />
              <TextInput
                placeholder="Search languages..."
                className="flex-1 ml-3 text-gray-900 font-medium"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="gray"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Language List */}
          <FlatList
            data={filteredLanguages}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, marginTop: 10 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <AnimatedLanguageItem
                item={item}
                isSelected={item.code === selectedCode}
                onPress={() => handleSelect(item)}
              />
            )}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400 font-medium">
                  No languages found
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
