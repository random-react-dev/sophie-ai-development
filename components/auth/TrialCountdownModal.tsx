import { RainbowBorder, RainbowGradient } from "@/components/common/Rainbow";
import { RainbowWave } from "@/components/lesson/RainbowWave";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useEffect } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
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
  const router = useRouter();

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

  const { isTrialExpired, remainingDays, daysPassed } = useAuthStore
    .getState()
    .checkTrialStatus();

  // If they are not logged in or we shouldn't show the popup, exit Early
  if (!user || !showTrialPopup) return null;

  // Only show trial popup AFTER onboarding is complete
  const onboardingCompleted =
    user?.user_metadata?.onboarding_data?.completed_at;
  if (!onboardingCompleted) return null;

  const isLastDay = remainingDays === 0 && !isTrialExpired;
  // Calculate discount based on days passed. Max discount 60%, Min 0%.
  // If expired, reset to 0 or leave at 0, depends on business logic.
  const discount = Math.max(0, (7 - Math.min(daysPassed + 1, 7)) * 10);

  const handleClose = () => {
    // Prevent closing if the trial is completely expired
    if (isTrialExpired) return;
    setShowTrialPopup(false);
  };

  const handleUpgrade = () => {
    setShowTrialPopup(false);
    // Add small delay so the modal closing animation can start before routing
    setTimeout(() => {
      router.push("/profile/subscription");
    }, 100);
  };

  return (
    <Modal
      visible={showTrialPopup}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-4">
        <Animated.View
          style={animatedStyle}
          className="bg-white rounded-[32px] p-4 w-full max-w-sm shadow-2xl"
        >
          {/* Close Button - hide if trial is expired since they MUST upgrade */}
          {!isTrialExpired && (
            <Pressable
              onPress={handleClose}
              className="absolute right-5 top-5 z-10 w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={22} color="#374151" />
            </Pressable>
          )}

          {/* Header with Icon */}
          <View className="items-center mb-5 mt-2">
            <Text className="text-xl font-black text-gray-900 text-center">
              {isTrialExpired
                ? t("trial_countdown_modal.expired_title")
                : isLastDay
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
                width={120}
                height={40}
                amplitudeScale={3.5}
                static={true}
              />
            </View>
            <Text className="text-gray-500 text-center mt-2 text-sm leading-5 px-2">
              {isTrialExpired
                ? t("trial_countdown_modal.expired_subtitle")
                : isLastDay
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

          {/* Discount Section */}
          {!isLastDay && !isTrialExpired && (
            <View className="rounded-2xl p-5 mb-5 items-center shadow-lg shadow-gray-200 overflow-hidden relative border border-gray-100">
              {/* Subtle rainbow gradient background like category selection */}
              <View className="absolute inset-0">
                <RainbowGradient className="flex-1 opacity-20" />
              </View>
              <View className="bg-black/10 px-3 py-1 rounded-full mb-1">
                <Text className="text-gray-800 font-bold uppercase tracking-wider text-xs">
                  {t("trial_countdown_modal.limited_time_offer")}
                </Text>
              </View>
              <Text className="text-[40px] font-black text-gray-900 text-center">
                {t("trial_countdown_modal.off_text", { percent: discount })}
              </Text>
              <Text className="text-gray-600 text-sm font-medium">
                {t("trial_countdown_modal.claim_discount_msg")}
              </Text>
            </View>
          )}

          {/* CTA Buttons */}
          <View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUpgrade}
              className="h-16 shadow-lg shadow-gray-200"
            >
              <RainbowBorder
                borderWidth={2}
                borderRadius={9999}
                className="flex-1"
                containerClassName="items-center justify-center"
              >
                <Text className="text-black font-bold text-base">
                  {isTrialExpired
                    ? t("trial_countdown_modal.choose_plan_btn")
                    : isLastDay
                      ? t("trial_countdown_modal.upgrade_now_btn")
                      : t("trial_countdown_modal.claim_discount_btn")}
                </Text>
              </RainbowBorder>
            </TouchableOpacity>

            {!isTrialExpired && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClose}
                className="h-12 items-center justify-center mt-2"
              >
                <Text className="text-gray-400 font-semibold">
                  {t("trial_countdown_modal.maybe_later_btn")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
