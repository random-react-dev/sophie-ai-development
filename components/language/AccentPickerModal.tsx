import CircleFlag from "@/components/common/CircleFlag";
import { RainbowBorder } from "@/components/common/Rainbow";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Accent {
  code: string;
  name: string;
  countryCode: string;
}

const ACCENTS: Accent[] = [
  { code: "Indian", name: "Indian", countryCode: "in" },
  { code: "Australian", name: "Australian", countryCode: "au" },
  { code: "American", name: "American", countryCode: "us" },
  { code: "British", name: "British", countryCode: "gb" },
];

// Accent Item Card
function AccentItem({
  accent,
  isSelected,
  onPress,
}: {
  accent: Accent;
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <CircleFlag countryCode={accent.countryCode} size={40} />
      <View className="flex-1 ml-4">
        <Text className="font-bold text-base text-gray-900">{accent.name}</Text>
        <Text className="text-gray-500 text-sm">{accent.name} English</Text>
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
  onSelect: (accent: string) => void;
  selectedAccent?: string;
}

export default function AccentPickerModal({
  visible,
  onClose,
  onSelect,
  selectedAccent,
}: AccentPickerModalProps) {
  const handleSelect = (accent: Accent) => {
    onSelect(accent.code);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
          <Text className="text-2xl font-bold text-black">Select Accent</Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="close" size={24} color="black" />
          </Pressable>
        </View>

        {/* Accent List */}
        <FlatList
          data={ACCENTS}
          keyExtractor={(item) => item.code}
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
              isSelected={item.code === selectedAccent}
              onPress={() => handleSelect(item)}
            />
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
