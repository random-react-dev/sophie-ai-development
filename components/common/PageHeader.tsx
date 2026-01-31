import { RainbowWave } from "@/components/lesson/RainbowWave";
import { useAuthStore } from "@/stores/authStore";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Headset } from "lucide-react-native";
import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";

interface PageHeaderProps {
  title?: string;
}

export const PageHeader = ({ title = "Sophie.ai" }: PageHeaderProps) => {
  const { user } = useAuthStore();

  const openWhatsApp = () => {
    Linking.openURL("https://wa.me/9898456150");
  };

  return (
    <View className="bg-white pb-2 px-4 shadow-sm z-50">
      <View className="h-16 flex-row items-center justify-between">
        {/* Left: Support/Help Icon */}
        <TouchableOpacity
          onPress={openWhatsApp}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center border border-blue-100 shadow-sm"
        >
          <Headset size={20} color="#3B82F6" />
        </TouchableOpacity>

        {/* Center: Title & Wave */}
        <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center pointer-events-none">
          <View className="items-center justify-center">
            <Text className="text-lg font-bold text-gray-900 leading-none">
              {title}
            </Text>
            <View className="items-center justify-start">
              <RainbowWave
                isListening={false}
                isSpeaking={false}
                isProcessing={true}
                volumeLevel={0}
                width={120}
                height={40}
                amplitudeScale={1.5}
              />
            </View>
          </View>
        </View>

        {/* Right: Profile */}
        <Link href="/profile" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm"
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
    </View>
  );
};
