import CircleFlag from "@/components/common/CircleFlag";
import { RainbowBorder } from "@/components/common/Rainbow";
import { Language, SUPPORTED_LANGUAGES } from "@/constants/languages";
import { Feather, Ionicons } from "@expo/vector-icons";

import React, { useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

// Language Item Card
function LanguageItem({
  item,
  isSelected,
  onPress,
}: {
  item: Language;
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <CircleFlag countryCode={item.countryCode} size={40} />
      <View className="flex-1 ml-4">
        <Text className="font-bold text-base text-gray-900">{item.name}</Text>
        <Text className="text-gray-500 text-sm">{item.nativeName}</Text>
      </View>
    </>
  );

  return (
    <Pressable onPress={onPress}>
      {isSelected ? (
        <RainbowBorder
          borderRadius={20}
          borderWidth={2}
          containerClassName="flex-row items-center px-4 py-4"
          className="bg-white"
        >
          <Content />
        </RainbowBorder>
      ) : (
        <View
          style={{ borderWidth: 1.5, borderRadius: 20, padding: 16 }}
          className="flex-row items-center border-gray-200 bg-white"
        >
          <Content />
        </View>
      )}
    </Pressable>
  );
}

interface LanguageSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (language: Language) => void;
  selectedCode?: string;
  title?: string;
}

// Popular languages shown first for quick access
const POPULAR_CODES = [
  "es",
  "fr",
  "de",
  "ja",
  "zh",
  "ko",
  "it",
  "pt",
  "hi",
  "ar",
];

export default function LanguageSelectorModal({
  visible,
  onClose,
  onSelect,
  selectedCode,
  title = "Select Language",
}: LanguageSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLanguages = useMemo(() => {
    let languages = SUPPORTED_LANGUAGES;

    // If no search, sort by popularity first
    if (!searchQuery.trim()) {
      const popular = languages.filter((lang) =>
        POPULAR_CODES.includes(lang.code),
      );
      const others = languages.filter(
        (lang) => !POPULAR_CODES.includes(lang.code),
      );
      // Sort popular by their order in POPULAR_CODES
      popular.sort(
        (a, b) => POPULAR_CODES.indexOf(a.code) - POPULAR_CODES.indexOf(b.code),
      );
      return [...popular, ...others];
    }

    const query = searchQuery.toLowerCase();
    return languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query),
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
            <Text className="text-xl font-bold text-black">{title}</Text>
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
            >
              <Ionicons name="close" size={24} color="black" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="px-4 py-3">
            <View className="h-12 bg-surface shadow-lg rounded-full flex-row items-center px-4">
              <Feather name="search" size={20} color="gray" />
              <TextInput
                placeholder="Search languages..."
                className="flex-1 ml-3 text-gray-900 font-medium text-sm p-0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="gray"
                textAlignVertical="center"
                style={{ includeFontPadding: false }}
              />
            </View>
          </View>

          {/* Language List */}
          <FlatList
            data={filteredLanguages}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
              marginTop: 10,
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <LanguageItem
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
