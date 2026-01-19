import CircleFlag from "@/components/common/CircleFlag";
import { RainbowBorder } from "@/components/common/Rainbow";
import { APP_LANGUAGES, Language } from "@/constants/languages";
import { Ionicons } from "@expo/vector-icons";

import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (lang: string) => void;
  selectedLang?: string;
}

const LANGUAGES = APP_LANGUAGES;



// Language Item Component
function LanguageItem({
  lang,
  isSelected,
  onPress,
}: {
  lang: Language;
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <View className="flex-row items-center gap-4">
        <View className="w-10 h-10 rounded-full items-center justify-center">
          <CircleFlag countryCode={lang.countryCode} size={40} />
        </View>
        <View>
          <Text className="text-base font-bold text-gray-900">{lang.name}</Text>
          <Text className="text-gray-500 text-sm mt-0.5">
            {lang.nativeName}
          </Text>
        </View>
      </View>


    </>
  );

  return (
    <Pressable onPress={onPress}>
      {isSelected ? (
        <RainbowBorder
          borderRadius={20}
          borderWidth={2}
          containerClassName="flex-row items-center justify-between px-[18px] py-[18px]"
          className="bg-white"
        >
          <Content />
        </RainbowBorder>
      ) : (
        <View
          style={{ borderWidth: 1.5, borderRadius: 20, padding: 18 }}
          className="flex-row items-center justify-between border-gray-200 bg-white"
        >
          <Content />
        </View>
      )}
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-4 py-6 bg-white border-b border-gray-100">
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
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <LanguageItem
                lang={item}
                isSelected={selectedLang === item.code}
                onPress={() => onSelect(item.code)}
              />
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
