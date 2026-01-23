import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Trash2, ArrowRight } from "lucide-react-native";
import { useTranslationHistoryStore, TranslationHistoryItem } from "@/stores/translationHistoryStore";
import * as Haptics from "expo-haptics";

interface TranslationHistoryProps {
  onSelect: (item: TranslationHistoryItem) => void;
}

export const TranslationHistory: React.FC<TranslationHistoryProps> = ({ onSelect }) => {
  const { history, clearHistory, removeEntry } = useTranslationHistoryStore();

  if (history.length === 0) {
    return null;
  }

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
      activeOpacity={0.7}
      onPress={() => handleSelect(item)}
      className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {item.sourceLang}
          </Text>
          <ArrowRight size={12} color="#9ca3af" />
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {item.targetLang}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveItem(item.id)}
          className="p-1 -mr-2 -mt-2"
        >
          <Trash2 size={14} color="#ef4444" opacity={0.5} />
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        <Text className="text-gray-900 text-base font-medium mb-1" numberOfLines={2}>
          {item.sourceText}
        </Text>
        <Text className="text-blue-600 text-lg font-semibold" numberOfLines={2}>
          {item.translatedText}
        </Text>
        {item.romanization && (
          <Text className="text-gray-500 text-sm italic mt-1">
            {item.romanization}
          </Text>
        )}
      </View>
      
      {/* Fallback for date formatting if date-fns causes issues, but it should be fine if installed. 
          If not, simple JS date. */}
      {/* <Text className="text-gray-300 text-xs text-right mt-1">
        {new Date(item.timestamp).toLocaleDateString()}
      </Text> */}
    </TouchableOpacity>
  );

  return (
    <View className="mt-8 mb-20 px-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="h-[1px] flex-1 bg-gray-200" />
        <Text className="mx-4 text-gray-400 font-medium text-sm">Recent Translations</Text>
        <View className="h-[1px] flex-1 bg-gray-200" />
      </View>

      <View className="flex-row justify-end mb-2">
        <TouchableOpacity onPress={handleClearAll}>
          <Text className="text-xs font-bold text-red-400">Clear History</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false} // Since it's inside a ScrollView in parent
      />
    </View>
  );
};
