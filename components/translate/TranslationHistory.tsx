import {
  TranslationHistoryItem,
  useTranslationHistoryStore,
} from "@/stores/translationHistoryStore";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

interface TranslationHistoryProps {
  onSelect: (item: TranslationHistoryItem) => void;
}

export const TranslationHistory: React.FC<TranslationHistoryProps> = ({
  onSelect,
}) => {
  const { history, clearHistory, removeEntry } = useTranslationHistoryStore();
  const [isVisible, setIsVisible] = useState(true);

  if (history.length === 0) {
    return null;
  }

  const handleToggleVisibility = () => {
    Haptics.selectionAsync();
    setIsVisible(!isVisible);
  };

  const handleClearAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearHistory();
  };

  const handleRemoveItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeEntry(id);
  };

  const handleSelect = (item: TranslationHistoryItem) => {
    Haptics.selectionAsync();
    onSelect(item);
  };

  const renderItem = ({ item }: { item: TranslationHistoryItem }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleSelect(item)}
      className="mb-3"
    >
      <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header with Language Tags */}
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <View className="flex-row items-center gap-2">
            <View className="bg-blue-50 px-2.5 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                {item.sourceLang}
              </Text>
            </View>
            <ArrowRight size={10} color="#9ca3af" />
            <View className="bg-purple-50 px-2.5 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                {item.targetLang}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveItem(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-6 h-6 items-center justify-center rounded-full bg-gray-50"
          >
            <X size={12} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="px-4 pb-4">
          <Text className="text-gray-600 text-sm mb-1.5" numberOfLines={1}>
            {item.sourceText}
          </Text>
          <Text
            className="text-gray-900 text-base font-semibold"
            numberOfLines={2}
          >
            {item.translatedText}
          </Text>
          {item.romanization && (
            <Text className="text-gray-400 text-sm italic mt-1">
              {item.romanization}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="mt-10 mb-20">
      {/* Section Header */}
      <TouchableOpacity
        onPress={handleToggleVisibility}
        activeOpacity={0.7}
        className="flex-row items-center justify-between mb-4"
      >
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
            <Clock size={16} color="#6b7280" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-base">
              Recent Translations
            </Text>
            <Text className="text-gray-400 text-xs">
              {history.length} {history.length === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Clear All Button */}
          <TouchableOpacity
            onPress={handleClearAll}
            className="px-3 py-2 rounded-full bg-red-50"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-1.5">
              <Trash2 size={12} color="#ef4444" />
              <Text className="text-xs font-bold text-red-500">Clear</Text>
            </View>
          </TouchableOpacity>

          {/* Expand/Collapse Chevron */}
          <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
            {isVisible ? (
              <ChevronUp size={16} color="#6b7280" />
            ) : (
              <ChevronDown size={16} color="#6b7280" />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* History List - Conditionally Rendered */}
      {isVisible && (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};
