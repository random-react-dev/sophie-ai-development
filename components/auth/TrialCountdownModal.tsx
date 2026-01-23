import { RainbowBorder, RainbowGradient } from "@/components/common/Rainbow";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { Check, Crown } from "lucide-react-native";
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
      <Text className="text-gray-700 font-medium text-base flex-1">{text}</Text>
    </View>
  );
}

export const TrialCountdownModal = () => {
  const { user, showTrialPopup, setShowTrialPopup } = useAuthStore();

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
  }, [showTrialPopup]);

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

  const { remainingDays, discount, isLastDay } = calculateTrialStatus(
    user.created_at,
  );

  const handleClose = () => {
    setShowTrialPopup(false);
  };

  const handleUpgrade = () => {
    // Placeholder for upgrade logic (e.g., navigate to subscription screen)
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
            <RainbowGradient className="w-20 h-20 rounded-3xl items-center justify-center mb-4">
              <Crown size={36} color="white" />
            </RainbowGradient>
            <Text className="text-3xl font-black text-gray-900 text-center">
              {isLastDay ? "Last Day!" : `${remainingDays} Days Left`}
            </Text>
            <Text className="text-gray-500 text-center mt-2 text-base leading-6">
              {isLastDay
                ? "Your free trial ends today!"
                : `Upgrade to Sophie AI Pro for the full experience.`}
            </Text>
          </View>

          {/* Benefits List */}
          <View className="bg-gray-50 rounded-2xl p-4 mb-5">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              What you&apos;ll get
            </Text>
            <BenefitItem text="Unlimited AI conversations" />
            <BenefitItem text="All 10+ languages unlocked" />
            <BenefitItem text="Advanced vocabulary tools" />
            <BenefitItem text="Priority support" />
          </View>

          {/* Discount Section */}
          {!isLastDay && (
            <View className="rounded-2xl p-5 mb-5 items-center shadow-lg shadow-gray-200 overflow-hidden relative border border-gray-100">
              {/* Subtle rainbow gradient background like category selection */}
              <View className="absolute inset-0">
                <RainbowGradient className="flex-1 opacity-20" />
              </View>
              <View className="bg-black/10 px-3 py-1 rounded-full mb-2">
                <Text className="text-gray-800 font-bold uppercase tracking-wider text-xs">
                  Limited Time Offer
                </Text>
              </View>
              <Text className="text-5xl font-black text-gray-900">
                {discount}% OFF
              </Text>
              <Text className="text-gray-600 text-sm mt-1 font-medium">
                Claim your discount today
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
                <Text className="text-black font-bold text-lg">
                  {isLastDay ? "Upgrade Now" : "Claim My Discount"}
                </Text>
              </RainbowBorder>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              className="h-12 items-center justify-center mt-2"
            >
              <Text className="text-gray-400 font-semibold">Maybe later</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
