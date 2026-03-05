import { RainbowBorder } from "@/components/common/Rainbow";
import { RainbowWave } from "@/components/lesson/RainbowWave";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { Check } from "lucide-react-native";
import React, { useEffect } from "react";
import { Modal, Pressable, Text, View, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// Benefit item component with rainbow border checkmark
function BenefitItem({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-3 mb-3">
      <RainbowBorder
        borderRadius={9999}
        borderWidth={2}
        className="w-6 h-6"
        containerClassName="items-center justify-center"
      >
        <Check size={12} color="black" strokeWidth={3} />
      </RainbowBorder>
      <Text className="text-gray-700 font-medium text-sm flex-1">{text}</Text>
    </View>
  );
}

export const TrialCountdownModal = () => {
  const { user, showTrialPopup, setShowTrialPopup } = useAuthStore();
  const { t } = useTranslation();

  // Animation values - slide up from bottom with spring bounce
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (showTrialPopup) {
      // Slide up with spring bounce
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 150,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      // Reset for next open
      translateY.value = 300;
      opacity.value = 0;
    }
  }, [showTrialPopup, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!user || !showTrialPopup) return null;

  // Only show trial popup AFTER onboarding is complete
  const onboardingCompleted =
    user?.user_metadata?.onboarding_data?.completed_at;
  if (!onboardingCompleted) return null;

  const calculateTrialStatus = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - createdDate.getTime();
    const daysPassed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const dayNumber = Math.min(Math.max(daysPassed + 1, 1), 7);

    return {
      dayNumber,
      remainingDays: 8 - dayNumber,
      discount: Math.max(0, (7 - dayNumber) * 10),
      isLastDay: dayNumber === 7,
    };
  };

  const { remainingDays, isLastDay } = calculateTrialStatus(
    user.created_at,
  );

  const handleClose = () => {
    setShowTrialPopup(false);
  };

  return (
    <Modal
      visible={showTrialPopup}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-5">
        <Animated.View
          style={animatedStyle}
          className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl"
        >
          {/* Close Button */}
          <Pressable
            onPress={handleClose}
            className="absolute right-5 top-5 z-10 w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="close" size={22} color="#374151" />
          </Pressable>

          {/* Header with Icon */}
          <View className="items-center mb-5">
            <Text className="text-xl font-black text-gray-900 text-center leading-none">
              {isLastDay
                ? t("trial_countdown_modal.last_day_title")
                : t("trial_countdown_modal.days_left_title", {
                    count: remainingDays,
                  })}
            </Text>
            {/* Rainbow Wave */}
            <View className="items-center justify-start">
              <RainbowWave
                isListening={false}
                isSpeaking={false}
                isProcessing={false}
                volumeLevel={0}
                width={120}
                height={40}
                amplitudeScale={3.5}
                static={true}
              />
            </View>
            <Text className="text-gray-500 text-center mt-2 text-sm leading-6">
              {isLastDay
                ? t("trial_countdown_modal.last_day_subtitle")
                : t("trial_countdown_modal.upgrade_subtitle")}
            </Text>
          </View>

          {/* Benefits List */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-5">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t("trial_countdown_modal.benefits_title")}
            </Text>
            <BenefitItem text={t("trial_countdown_modal.benefit_1")} />
            <BenefitItem text={t("trial_countdown_modal.benefit_2")} />
            <BenefitItem text={t("trial_countdown_modal.benefit_3")} />
            <BenefitItem text={t("trial_countdown_modal.benefit_4")} />
          </View>

          {/* CTA Buttons */}
          <View>
            <View className="h-16 rounded-full items-center justify-center bg-gray-200 opacity-50">
              <Text className="text-gray-500 font-bold text-base">
                Coming Soon
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              className="h-12 items-center justify-center mt-2"
            >
              <Text className="text-gray-400 font-semibold">
                {t("trial_countdown_modal.maybe_later_btn")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
