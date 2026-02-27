import CircleFlag from "@/components/common/CircleFlag";
import { RainbowBorder } from "@/components/common/Rainbow";
import { Feather, Ionicons } from "@expo/vector-icons";

import React, { useState } from "react";
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

interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: string) => void;
  selectedCountry?: string;
  title?: string;
}

const COUNTRIES = [
  { name: "Australia", code: "au" },
  { name: "Brazil", code: "br" },
  { name: "Canada", code: "ca" },
  { name: "China", code: "cn" },
  { name: "France", code: "fr" },
  { name: "Germany", code: "de" },
  { name: "India", code: "in" },
  { name: "Indonesia", code: "id" },
  { name: "Italy", code: "it" },
  { name: "Japan", code: "jp" },
  { name: "Mexico", code: "mx" },
  { name: "Netherlands", code: "nl" },
  { name: "Russia", code: "ru" },
  { name: "Saudi Arabia", code: "sa" },
  { name: "South Korea", code: "kr" },
  { name: "Spain", code: "es" },
  { name: "Switzerland", code: "ch" },
  { name: "Turkey", code: "tr" },
  { name: "United Kingdom", code: "gb" },
  { name: "United States", code: "us" },
];



// Country Item Component
function CountryItem({
  item,
  isSelected,
  onPress,
}: {
  item: { name: string; code: string };
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <CircleFlag countryCode={item.code} size={40} />
      <Text className="flex-1 ml-4 text-base font-bold text-gray-900">
        {item.name}
      </Text>

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

export default function CountryPicker({
  visible,
  onClose,
  onSelect,
  selectedCountry,
  title = "Select Country",
}: CountryPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = (() => {
    if (!searchQuery.trim()) return COUNTRIES;

    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  })();

  const handleSelect = (countryName: string) => {
    onSelect(countryName);
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
          <View className="px-4 py-3">
            <View className="h-12 bg-surface shadow-lg rounded-full flex-row items-center px-4">
              <Feather name="search" size={20} color="gray" />
              <TextInput
                placeholder="Search countries..."
                className="flex-1 ml-3 text-gray-900 font-medium text-base p-0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="gray"
                textAlignVertical="center"
                style={{ includeFontPadding: false }}
              />
            </View>
          </View>

          {/* Country List */}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
              marginTop: 10,
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <CountryItem
                item={item}
                isSelected={selectedCountry === item.name}
                onPress={() => handleSelect(item.name)}
              />
            )}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400 font-medium">
                  No countries found
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
