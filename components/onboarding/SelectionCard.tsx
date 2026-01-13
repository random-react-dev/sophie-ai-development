import { LucideIcon } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface SelectionCardProps {
  title: string;
  selected: boolean;
  onSelect: () => void;
  icon?: LucideIcon;
  description?: string;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  selected,
  onSelect,
  icon: Icon,
  description,
}) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      className={`flex-row items-center p-5 mb-4 rounded-3xl border ${
        selected ? "bg-blue-50 border-blue-500" : "bg-white border-gray-100"
      }`}
      style={
        selected
          ? {
              elevation: 2,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }
          : {}
      }
    >
      {Icon && (
        <View
          className={`w-12 h-12 items-center justify-center rounded-2xl mr-4 ${
            selected ? "bg-white" : "bg-gray-50"
          }`}
        >
          <Icon size={24} color={selected ? "#3B82F6" : "#6B7280"} />
        </View>
      )}
      <View className="flex-1">
        <Text
          className={`text-lg font-bold ${
            selected ? "text-blue-600" : "text-gray-900"
          }`}
        >
          {title}
        </Text>
        {description && (
          <Text
            className={`text-sm mt-0.5 ${
              selected ? "text-blue-500" : "text-gray-500"
            }`}
          >
            {description}
          </Text>
        )}
      </View>
      <View
        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          selected ? "border-blue-500 bg-blue-500" : "border-gray-200 bg-white"
        }`}
      >
        {selected && <View className="w-2 h-2 bg-white rounded-full" />}
      </View>
    </TouchableOpacity>
  );
};
