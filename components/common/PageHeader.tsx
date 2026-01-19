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
                <Text className="text-black text-2xl font-bold">{title}</Text>
                <Text className="text-gray-500 text-base font-medium">{subtitle}</Text>
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
                            <Text className="text-blue-500 font-bold">
                                {user?.email?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Link>
        </View>
    );
};
