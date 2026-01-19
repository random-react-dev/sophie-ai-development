import { Bookmark, Globe, Wand2 } from "lucide-react-native";
import React from "react";
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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    onTranslate,
    onSave,
}) => {
    const isUser = message.role === "user";

    return (
        <View
            className={`mb-6 ${isUser ? "items-end" : "items-start"}`}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`${isUser ? "You" : "Sophie"} said: ${message.text}`}
        >
            <View
                className={`p-4 rounded-2xl max-w-[85%] ${isUser
                    ? "bg-blue-500"
                    : "bg-gray-100 border border-gray-200 shadow-sm"
                    }`}
            >
                {/* Natural Correction Badge - Only for AI messages */}
                {!isUser && (
                    <View className="flex-row items-center gap-1 mb-1">
                        <Wand2 size={10} color="#3b82f6" />
                        <Text className="text-blue-500 text-[8px] font-black uppercase tracking-widest">
                            Natural Correction
                        </Text>
                    </View>
                )}

                {/* Message Text */}
                <Text
                    className={`text-base font-medium leading-relaxed ${isUser ? "text-white" : "text-gray-900"
                        }`}
                >
                    {message.text}
                </Text>

                {/* Action Buttons */}
                <View
                    className={`flex-row mt-2 gap-4 border-t pt-2 ${isUser ? "border-blue-400" : "border-gray-200"
                        }`}
                >
                    <TouchableOpacity
                        className="flex-row items-center gap-1"
                        onPress={() => onTranslate(message.text)}
                        accessibilityRole="button"
                        accessibilityLabel="Translate message"
                        accessibilityHint="Translates this message to English"
                    >
                        <Globe size={12} color={isUser ? "#dbeafe" : "#94a3b8"} />
                        <Text
                            className={`text-[10px] font-bold ${isUser ? "text-blue-100" : "text-gray-400"
                                }`}
                        >
                            Translate
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-row items-center gap-1"
                        onPress={() => onSave(message.text)}
                        accessibilityRole="button"
                        accessibilityLabel="Save to vocabulary"
                        accessibilityHint="Saves this message to your vocabulary list"
                    >
                        <Bookmark size={12} color={isUser ? "#dbeafe" : "#94a3b8"} />
                        <Text
                            className={`text-[10px] font-bold ${isUser ? "text-blue-100" : "text-gray-400"
                                }`}
                        >
                            Save
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
