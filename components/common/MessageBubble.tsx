import { ChatAvatar } from "@/components/common/ChatAvatar";
import { useTranslation } from "@/hooks/useTranslation";
import { EyeOff, Languages, Plus } from "lucide-react-native";
import React, { memo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: number;
}

interface MessageBubbleProps {
  message: Message;
  onTranslate: (text: string) => Promise<string | null>;
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
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleTranslatePress = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translation) {
      setShowTranslation(true);
      return;
    }

    setIsLoading(true);
    const result = await onTranslate(message.text);
    setIsLoading(false);

    if (result) {
      setTranslation(result);
      setShowTranslation(true);
    }
  };

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

        <View className="shrink max-w-[85%]">
          {/* Message Bubble with Tail Effect */}
          <View
            className={`p-4 bg-gray-100 ${
              isUser
                ? "rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-none"
                : "rounded-tl-2xl rounded-tr-2xl rounded-bl-none rounded-br-2xl"
            }`}
          >
            <Text className="text-base font-medium leading-relaxed text-gray-900">
              {message.text}
            </Text>

            {/* Inline Translation Display */}
            {showTranslation && translation && (
              <View className="mt-3 pt-3 border-t border-gray-300/50">
                <Text className="text-sm font-medium text-gray-600 italic leading-relaxed">
                  {translation}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons - Outside and Below Bubble */}
          <View
            className={`flex-row mt-1 gap-4 ${isUser ? "justify-end mr-1" : "ml-1"}`}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center gap-1"
              onPress={handleTranslatePress}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={
                showTranslation
                  ? t("talk_screen.message_actions.hide")
                  : t("talk_screen.message_actions.translate")
              }
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#6b7280" />
              ) : (
                <>
                  {showTranslation ? (
                    <EyeOff size={12} color="#6b7280" />
                  ) : (
                    <Languages size={12} color="#6b7280" />
                  )}
                  <Text className="text-xs font-bold text-gray-500">
                    {showTranslation
                      ? t("talk_screen.message_actions.hide")
                      : t("talk_screen.message_actions.translate")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center gap-1"
              onPress={() => onSave(message.text)}
              accessibilityRole="button"
              accessibilityLabel={t("talk_screen.message_actions.save")}
              accessibilityHint="Saves this message to your vocabulary list"
            >
              <Plus size={12} color="#6b7280" />
              <Text className="text-xs font-bold text-gray-500">
                {t("talk_screen.message_actions.save")}
              </Text>
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
MessageBubble.displayName = "MessageBubble";
