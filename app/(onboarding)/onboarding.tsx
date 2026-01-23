import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { RainbowBorder } from "@/components/common/Rainbow";
import { BarrierStep } from "@/components/onboarding/BarrierStep";
import { CompletionStep } from "@/components/onboarding/CompletionStep";
import { ConfidenceStep } from "@/components/onboarding/ConfidenceStep";
import { DiscoveryStep } from "@/components/onboarding/DiscoveryStep";
import { DurationStep } from "@/components/onboarding/DurationStep";
import { FluencyStep } from "@/components/onboarding/FluencyStep";
import { FocusStep } from "@/components/onboarding/FocusStep";
import { GoalStep } from "@/components/onboarding/GoalStep";
import { LevelStep } from "@/components/onboarding/LevelStep";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import {
  ProfileStep,
  ProfileStepRef,
} from "@/components/onboarding/ProfileStep";
import { RainbowProgressBar } from "@/components/onboarding/RainbowProgressBar";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Animated border line with smooth fade animation
const AnimatedBorderLine: React.FC<{ visible: boolean }> = ({ visible }) => {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "#e5e7eb", // gray-200
        },
      ]}
    />
  );
};

// Step configuration with titles for OnboardingHeader
const stepConfig: Record<number, { title: string; subtitle?: string }> = {
  1: { title: "" }, // ProfileStep handles its own header
  2: { title: "What's your main goal in life?" },
  3: { title: "How quickly do you want to become fluent?" },
  4: { title: "How long have you been studying this language?" },
  5: { title: "Which best describes you?" },
  6: { title: "How confident are you?" },
  7: { title: "Why are you not confident?" },
  8: { title: "What do you want to focus on first?" },
  9: { title: "How did you find us?" },
  10: { title: "" }, // CompletionStep has its own centered header
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { alertState, showAlert, hideAlert } = useAlertModal();
  const { updateProfile, isLoading: isSaving } = useAuthStore();
  const { currentStep, nextStep, prevStep, data, resetOnboarding } =
    useOnboardingStore();
  const { t } = useTranslation();

  // Ref for ProfileStep sub-step control
  const profileStepRef = useRef<ProfileStepRef>(null);

  // Dynamic border state - shows when content is scrollable and not at bottom
  const [showBorder, setShowBorder] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const contentHeight = useRef(0);
  const containerHeight = useRef(0);

  const updateBorderVisibility = useCallback((scrollY: number = 0) => {
    const isScrollable = contentHeight.current > containerHeight.current;
    const isAtBottom =
      scrollY + containerHeight.current >= contentHeight.current - 10; // 10px threshold
    setShowBorder(isScrollable && !isAtBottom);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      updateBorderVisibility(scrollY);
    },
    [updateBorderVisibility],
  );

  const handleContentSizeChange = useCallback(
    (width: number, height: number) => {
      contentHeight.current = height;
      updateBorderVisibility();
    },
    [updateBorderVisibility],
  );

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      containerHeight.current = event.nativeEvent.layout.height;
      updateBorderVisibility();
    },
    [updateBorderVisibility],
  );

  const handleContinue = async () => {
    if (currentStep === 10) {
      try {
        const onboardingMetadata = {
          full_name: data.name,
          country: data.country,
          native_language: data.nativeLanguage,
          app_language: data.preferredLanguage,
          learn_language: data.preferredLanguage,
          onboarding_data: {
            main_goal: data.mainGoal,
            fluency_speed: data.fluencySpeed,
            learning_duration: data.learningDuration,
            speaking_level: data.speakingLevel,
            confidence_level: data.confidenceLevel,
            barriers: data.barriers,
            focus_areas: data.focusAreas,
            discovery_source: data.discoverySource,
            completed_at: new Date().toISOString(),
          },
        };

        await updateProfile(onboardingMetadata);
        resetOnboarding();
        router.replace("/(tabs)/talk");
      } catch {
        showAlert(
          t("common.error"),
          t("common.errorMessage"),
          undefined,
          "error",
        );
      }
    } else if (currentStep === 1) {
      // Handle ProfileStep sub-steps
      if (profileStepRef.current) {
        // Try to advance sub-step first
        const advancedSubStep = profileStepRef.current.goToNextSubStep();
        if (advancedSubStep) {
          return; // Stay on step 1, sub-step changed
        }
      }

      // Sub-step 2 validation: check name and country
      if (!data.name || !data.country) {
        showAlert(
          t("common.incomplete"),
          t("common.incompleteMessage"),
          undefined,
          "warning",
        );
        return;
      }

      // All sub-steps complete, advance to next main step
      nextStep();
    } else {
      nextStep();
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // Handle ProfileStep sub-step back navigation
      if (profileStepRef.current) {
        const wentBackSubStep = profileStepRef.current.goToPrevSubStep();
        if (wentBackSubStep) {
          return; // Stay on step 1, went back to previous sub-step
        }
      }
      // If on sub-step 1, go back to previous screen
      router.back();
    } else {
      prevStep();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProfileStep
            ref={profileStepRef}
            onScrollStateChange={(shouldShow) => setShowBorder(shouldShow)}
          />
        );
      case 2:
        return <GoalStep />;
      case 3:
        return <FluencyStep />;
      case 4:
        return <DurationStep />;
      case 5:
        return <LevelStep />;
      case 6:
        return <ConfidenceStep />;
      case 7:
        return <BarrierStep />;
      case 8:
        return <FocusStep />;
      case 9:
        return <DiscoveryStep />;
      case 10:
        return <CompletionStep />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-2 pt-4 gap-3">
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBack}
          className="p-2 -ml-2 rounded-full active:bg-gray-100"
          disabled={isSaving}
        >
          <ChevronLeft size={28} color="#1f2937" />
        </TouchableOpacity>

        {/* Inline Rainbow Progress Bar */}
        <View className="flex-1">
          <RainbowProgressBar currentStep={currentStep} totalSteps={10} />
        </View>

        {/* Step Counter */}
        <View className="min-w-[40px] items-end">
          <Text className="text-sm font-bold text-gray-400">
            <Text className="text-gray-900">{currentStep}</Text>/10
          </Text>
        </View>
      </View>

      {currentStep === 1 ? (
        // ProfileStep uses FlatList internally, so we use View instead of ScrollView
        <View className="flex-1">{renderStep()}</View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          scrollEventThrottle={16}
        >
          {/* Render OnboardingHeader for steps with titles */}
          {stepConfig[currentStep]?.title && (
            <OnboardingHeader
              title={stepConfig[currentStep].title}
              subtitle={stepConfig[currentStep].subtitle}
            />
          )}
          {renderStep()}
        </ScrollView>
      )}

      {/* Continue Button */}
      <View className="p-4 bg-white">
        {/* Animated Border Line */}
        <AnimatedBorderLine visible={showBorder} />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleContinue}
          disabled={isSaving}
          className="w-full h-16 rounded-full overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <RainbowBorder
            borderWidth={2}
            borderRadius={9999}
            className="flex-1"
            containerClassName="items-center justify-center"
            innerBackgroundClassName="bg-white"
          >
            <Text className="text-gray-900 font-bold text-lg">
              {isSaving
                ? t("onboarding.saving")
                : currentStep === 10
                  ? t("onboarding.startLearning")
                  : t("onboarding.continue")}
            </Text>
          </RainbowBorder>
        </TouchableOpacity>
        {currentStep === 9 && (
          <TouchableOpacity
            onPress={nextStep}
            className="items-center mt-4"
            disabled={isSaving}
          >
            <Text className="text-gray-400 font-medium">{t("onboarding.skip")}</Text>
          </TouchableOpacity>
        )}
      </View>
      <AlertModal {...alertState} onClose={hideAlert} />
    </SafeAreaView>
  );
}
