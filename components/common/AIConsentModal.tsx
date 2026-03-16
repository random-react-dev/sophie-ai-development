import { Button } from "@/components/common/Button";
import { useTranslation } from "@/hooks/useTranslation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AI_CONSENT_KEY = "ai_consent_accepted";

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AIConsentModal({
  visible,
  onAccept,
  onDecline,
}: AIConsentModalProps) {
  const { t } = useTranslation();

  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = 300;
      opacity.value = 0;
    }
  }, [visible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 justify-center items-center px-5">
        <Animated.View
          style={animatedStyle}
          className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl"
        >
          {/* Title */}
          <Text className="text-xl font-black text-gray-900 text-center mb-4">
            {t("aiConsent.title")}
          </Text>

          {/* Body */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-5">
            <Text className="text-gray-700 text-sm leading-6 mb-3">
              {t("aiConsent.body")}
            </Text>
            <Text className="text-gray-500 text-sm leading-6">
              {t("aiConsent.privacy")}
            </Text>
          </View>

          {/* Accept Button */}
          <Button
            title={t("aiConsent.accept") as string}
            onPress={onAccept}
            variant="rainbow"
            className="w-full h-14"
          />

          {/* Decline Button */}
          <Pressable
            onPress={onDecline}
            className="h-12 items-center justify-center mt-2"
          >
            <Text className="text-gray-400 font-semibold">
              {t("aiConsent.decline")}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Hook to manage AI consent state.
 * Reads from AsyncStorage on mount. Returns helpers to show/accept/decline consent.
 */
export function useAIConsent() {
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  // true while AsyncStorage hasn't finished loading the consent value
  const isLoading = hasConsented === null;

  useEffect(() => {
    AsyncStorage.getItem(AI_CONSENT_KEY).then((value) => {
      setHasConsented(value === "true");
    });
  }, []);

  const requestConsent = useCallback(() => {
    if (hasConsented) return;
    setShowConsent(true);
  }, [hasConsented]);

  const acceptConsent = useCallback(() => {
    setHasConsented(true);
    setShowConsent(false);
    AsyncStorage.setItem(AI_CONSENT_KEY, "true");
  }, []);

  const declineConsent = useCallback(() => {
    setShowConsent(false);
  }, []);

  return {
    hasConsented,
    showConsent,
    isLoading,
    requestConsent,
    acceptConsent,
    declineConsent,
  };
}
