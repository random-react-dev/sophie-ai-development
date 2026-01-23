import { safeGoBack } from "@/utils/navigation";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ProfileHeaderProps {
  title: string;
}

export default function ProfileHeader({ title }: ProfileHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-4 py-4 flex-row items-center bg-white">
      {/* Left - Back Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => safeGoBack(router, "/(tabs)/language")}
        className="p-2 -ml-2 w-10"
      >
        <ArrowLeft size={24} color="#1e293b" />
      </TouchableOpacity>

      {/* Center - Title */}
      <View className="flex-1 items-center">
        <Text className="text-xl font-bold text-gray-900">{title}</Text>
      </View>

      {/* Right - Empty spacer for balance */}
      <View className="w-10" />
    </View>
  );
}
