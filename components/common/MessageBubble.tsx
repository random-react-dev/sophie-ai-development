import { ChatAvatar } from "@/components/common/ChatAvatar";
import { Languages, Plus } from "lucide-react-native";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Message {
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: number;
}

interface MessageBubbleProps {
    message: Message;
    onTranslate: (text: string) => void;
    onSave: (text: string) => void;
    userAvatarUri?: string | null;
    userName?: string;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
    message,
    onTranslate,
    onSave,
    userAvatarUri,
    userName,
}) => {
    const isUser = message.role === "user";

    return (
        <View
            className={`mb-6 flex-row w-full ${isUser ? "justify-end" : "justify-start"}`}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`${isUser ? "You" : "Sophie"} said: ${message.text}`}
        >
            <View
                className={`flex-row max-w-full ${isUser ? "justify-end" : "justify-start"} gap-2`}
            >
                {/* AI Avatar - Left */}
                {!isUser && (
                    <View>
                        <ChatAvatar role="model" />
                    </View>
                )}

                <View className="shrink">
                    {/* Message Bubble with Tail Effect */}
                    <View
                        className={`p-4 bg-gray-100 ${isUser
                            ? "rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-none"
                            : "rounded-tl-2xl rounded-tr-2xl rounded-bl-none rounded-br-2xl"
                            }`}
                    >
                        <Text className="text-base font-medium leading-relaxed text-gray-900">
                            {message.text}
                        </Text>
                    </View>

                    {/* Action Buttons - Outside and Below Bubble */}
                    <View className={`flex-row mt-1 gap-4 ${isUser ? "justify-end mr-1" : "ml-1"}`}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="flex-row items-center gap-1"
                            onPress={() => onTranslate(message.text)}
                            accessibilityRole="button"
                            accessibilityLabel="Translate message"
                            accessibilityHint="Translates this message to English"
                        >
                            <Languages size={12} color="#6b7280" />
                            <Text className="text-xs font-bold text-gray-500">Translate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="flex-row items-center gap-1"
                            onPress={() => onSave(message.text)}
                            accessibilityRole="button"
                            accessibilityLabel="Save to vocabulary"
                            accessibilityHint="Saves this message to your vocabulary list"
                        >
                            <Plus size={12} color="#6b7280" />
                            <Text className="text-xs font-bold text-gray-500">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* User Avatar - Right */}
                {isUser && (
                    <View>
                        <ChatAvatar role="user" uri={userAvatarUri} name={userName} />
                    </View>
                )}
            </View>
        </View>
    );
};

// Memoized to prevent re-renders in FlatList when props are unchanged
export const MessageBubble = memo(MessageBubbleComponent);
MessageBubble.displayName = 'MessageBubble';
