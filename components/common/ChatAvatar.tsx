import { Image } from "expo-image";
import { Sparkles } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

interface ChatAvatarProps {
    uri?: string | null;
    name?: string;
    role: "user" | "model";
}

export const ChatAvatar: React.FC<ChatAvatarProps> = ({ uri, name, role }) => {
    const isModel = role === "model";

    // Fallback for initials
    const getInitials = (fullName?: string) => {
        if (!fullName) return "?";
        const parts = fullName.split(" ").filter((p) => p.length > 0);
        if (parts.length === 0) return "?";
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Base container style
    const containerStyle = "w-10 h-10 rounded-full items-center justify-center border border-gray-100 shadow-sm";

    // Custom AI Avatar (Sophie) - Purple theme matching the app's AI aesthetic
    if (isModel) {
        return (
            <View
                className={`${containerStyle} bg-purple-100`}
                accessibilityRole="image"
                accessibilityLabel="Sophie's Avatar"
            >
                <Sparkles size={20} color="#a855f7" />
            </View>
        );
    }

    // User Avatar with Image
    if (uri) {
        return (
            <View className={`${containerStyle} bg-gray-100 overflow-hidden`}>
                <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    accessibilityRole="image"
                    accessibilityLabel="User Avatar"
                />
            </View>
        );
    }

    // User Avatar Fallback (Initials)
    return (
        <View
            className={`${containerStyle} bg-blue-100`}
            accessibilityRole="image"
            accessibilityLabel={`Avatar for ${name || "User"}`}
        >
            <Text className="text-blue-600 font-bold text-sm">
                {getInitials(name)}
            </Text>
        </View>
    );
};
