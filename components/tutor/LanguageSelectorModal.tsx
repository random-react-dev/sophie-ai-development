import { Language, SUPPORTED_LANGUAGES } from "@/constants/languages";
import { Search, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
        POPULAR_CODES.includes(lang.code)
      );
      const others = languages.filter(
        (lang) => !POPULAR_CODES.includes(lang.code)
      );
      // Sort popular by their order in POPULAR_CODES
      popular.sort(
        (a, b) => POPULAR_CODES.indexOf(a.code) - POPULAR_CODES.indexOf(b.code)
      );
      return [...popular, ...others];
    }

    const query = searchQuery.toLowerCase();
    return languages.filter(
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
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable className="flex-1 bg-black/50" onPress={handleClose}>
        <Pressable
          className="flex-1 mt-20 bg-white rounded-t-[32px]"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">{title}</Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
            >
              <X size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-6 py-4">
            <View className="h-12 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-gray-100">
              <Search size={18} color="#94a3b8" />
              <TextInput
                placeholder="Search languages..."
                className="flex-1 ml-3 text-gray-900 font-medium"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Language List */}
          <FlatList
            data={filteredLanguages}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.code === selectedCode;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  className={`flex-row items-center py-4 px-4 rounded-2xl mb-2 ${
                    isSelected
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <Text className="text-2xl mr-4">{item.flag}</Text>
                  <View className="flex-1">
                    <Text
                      className={`font-bold text-base ${
                        isSelected ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-gray-400 text-sm">
                      {item.nativeName}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400 font-medium">
                  No languages found
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
