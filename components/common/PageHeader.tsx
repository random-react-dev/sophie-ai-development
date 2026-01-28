import { RainbowWave } from "@/components/lesson/RainbowWave";
import { useAuthStore } from "@/stores/authStore";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface PageHeaderProps {
  title?: string;
}

export const PageHeader = ({ title = "Sophie.ai" }: PageHeaderProps) => {
  const { user } = useAuthStore();

  return (
    <View className="bg-white mb-6 relative z-14 pb-2">
      {/* Top Row: Logo, Wave, Profile */}
      <View className="px-4 h-16 flex-row justify-between items-center relative">
        {/* Center: Interactive Wave Visual (Absolute Positioned for perfect centering) */}
        <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center pointer-events-none">
          <RainbowWave
            isListening={false}
            isSpeaking={false}
            isProcessing={true}
            volumeLevel={0}
            width={170}
            height={80}
          />
        </View>

        {/* Left: Logo */}
        <Text className="text-xl font-bold text-gray-900 z-20">{title}</Text>

        {/* Right: Profile */}
        <Link href="/profile" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full overflow-hidden border border-gray-200"
          >
            {user?.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: user.user_metadata.avatar_url }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-blue-50">
                <Text className="text-base font-bold text-blue-500">
                  {user?.email?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Link>
      </View>

      {/* Bottom Row: Tagline */}
      <View
        className="items-center justify-center relative z-0"
        style={{ marginTop: -5 }}
      >
        <Text className="text-xs font-bold text-gray-400">
          Any Language. Anywhere. Anytime.
        </Text>
      </View>
    </View>
  );
};
