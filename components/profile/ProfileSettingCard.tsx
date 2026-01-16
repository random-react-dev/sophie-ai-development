import { RainbowColorScheme } from "@/utils/rainbowColors";
import { ChevronRight } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ProfileSettingCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  onPress?: () => void;
  showArrow?: boolean;
  textColor?: string;
  rightElement?: React.ReactNode;
  cardBgColor?: string;
  borderColor?: string;
  colorScheme?: RainbowColorScheme;
}

export default function ProfileSettingCard({
  title,
  subtitle,
  icon,
  iconBgColor,
  onPress,
  showArrow = true,
  textColor = "text-gray-900",
  rightElement,
  cardBgColor = "bg-surface",
  borderColor,
  colorScheme,
}: ProfileSettingCardProps) {
  // Use colorScheme values if provided, otherwise fall back to individual props
  const actualIconBgColor = colorScheme?.iconBgColor || iconBgColor || "bg-gray-100";
  const actualCardBgColor = colorScheme ? "bg-white" : cardBgColor;
  const actualBorderColor = colorScheme?.borderColor || borderColor || "border-transparent";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      className={`${actualCardBgColor} rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm border ${actualBorderColor}`}
    >
      <View className="flex-1 flex-row items-center gap-4">
        <View
          className={`w-11 h-11 shrink-0 rounded-xl items-center justify-center ${actualIconBgColor}`}
        >
          {icon}
        </View>
        <View className="flex-1 shrink">
          <Text className={`text-base font-semibold ${textColor}`}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement ? (
        rightElement
      ) : showArrow ? (
        <ChevronRight size={20} color="#111827" />
      ) : null}
    </TouchableOpacity>
  );
}
