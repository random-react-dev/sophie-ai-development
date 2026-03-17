import CircleFlag from "@/components/common/CircleFlag";
import { RainbowBorder } from "@/components/common/Rainbow";
import {
  AccentVariant,
  getAccentsForLanguage,
} from "@/constants/accents";
import { useTranslation } from "@/hooks/useTranslation";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Accent Item Card
function AccentItem({
  accent,
  isSelected,
  onPress,
}: {
  accent: AccentVariant;
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <CircleFlag countryCode={accent.countryCode} size={40} />
      <View className="flex-1 ml-4">
        <Text className="font-bold text-base text-gray-900">
          {accent.name}
        </Text>
        <Text className="text-gray-500 text-sm">{accent.bcp47}</Text>
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

interface AccentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (accent: AccentVariant) => void;
  /** Currently selected BCP 47 accent code (e.g., "en-US") */
  selectedAccent?: string;
  /** ISO 639-1 code of the target language (e.g., "en", "fr") */
  targetLanguageCode: string;
  /** When true, renders as an absolutely-positioned View instead of a native Modal.
   *  Use this when the picker is opened from inside another Modal (iOS only supports one native modal). */
  renderInline?: boolean;
}

export default function AccentPickerModal({
  visible,
  onClose,
  onSelect,
  selectedAccent,
  targetLanguageCode,
  renderInline,
}: AccentPickerModalProps) {
  const { t } = useTranslation();

  const accents = getAccentsForLanguage(targetLanguageCode);

  const innerContent = (
    <>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-black">
          {t("accent_picker.title")}
        </Text>
        <Pressable
          onPress={onClose}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="close" size={24} color="black" />
        </Pressable>
      </View>

      {/* Accent List */}
      <FlatList
        data={accents}
        keyExtractor={(item) => item.bcp47}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
          marginTop: 10,
        }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <AccentItem
            accent={item}
            isSelected={item.bcp47 === selectedAccent}
            onPress={() => onSelect(item)}
          />
        )}
      />
    </>
  );

  if (renderInline) {
    if (!visible) return null;
    return (
      <View
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 50,
          backgroundColor: "white",
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          {innerContent}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">{innerContent}</SafeAreaView>
    </Modal>
  );
}
