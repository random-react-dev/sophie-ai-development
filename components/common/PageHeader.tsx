import { useAuthStore } from "@/stores/authStore";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
}

export const PageHeader = ({
  title = "Sophie AI",
  subtitle = "Any Language. Anytime. Anywhere",
}: PageHeaderProps) => {
  const { user } = useAuthStore();

  return (
    <View className="px-4 py-4 mb-2 flex-row justify-center items-center relative">
      <View className="items-center">
        <Text
          allowFontScaling={false}
          style={{ fontSize: 24, fontWeight: "bold" }}
          className="text-black"
        >
          {title}
        </Text>
        <Text
          allowFontScaling={false}
          style={{ fontSize: 14, fontWeight: "bold" }}
          className="text-gray-500"
        >
          {subtitle}
        </Text>
      </View>
      <Link href="/profile" asChild>
        <TouchableOpacity
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 absolute left-6"
        >
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              className="w-full h-full"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-blue-50">
              <Text
                allowFontScaling={false}
                style={{ fontSize: 16, fontWeight: "bold" }}
                className="text-blue-500"
              >
                {user?.email?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Link>
    </View>
  );
};
