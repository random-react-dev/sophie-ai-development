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
import { getLanguageByCode } from "@/constants/languages";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useLearningStore } from "@/stores/learningStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useProfileStore } from "@/stores/profileStore";
import { safeGoBack } from "@/utils/navigation";
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
// Step configuration moved inside component to support dynamic translation
// const stepConfig... removed

export default function OnboardingScreen() {
  const router = useRouter();
  const { alertState, showAlert, hideAlert } = useAlertModal();
  const { updateProfile, isLoading: isSaving } = useAuthStore();
  const { currentStep, nextStep, prevStep, data, resetOnboarding } =
    useOnboardingStore();
  const { addProfile } = useProfileStore();
  const { setTargetLanguage, setNativeLanguage } = useLearningStore();
  const { t } = useTranslation();

  // Ref for ProfileStep sub-step control
  const profileStepRef = useRef<ProfileStepRef>(null);

  // Dynamic border state - shows when content is scrollable and not at bottom
  const [showBorder, setShowBorder] = useState(false);
  const [profileSubStep, setProfileSubStep] = useState(1);
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

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
      case 1:
        // ProfileStep validation based on sub-step
        if (profileSubStep === 1) {
          // Sub-step 1: App language selection
          // Always true since we have a default, but good to check store
          const { currentLanguage } = useLanguageStore.getState();
          return !!currentLanguage;
        }
        if (profileSubStep === 2) {
          // Sub-step 2: Learning language
          return !!data.learningLanguage;
        }
        if (profileSubStep === 3) {
          // Sub-step 3: Profile details (Name, Country, Native Language)
          return !!data.name && !!data.country && !!data.nativeLanguage;
        }
        return true;
      case 2:
        return !!data.mainGoal;
      case 3:
        return !!data.fluencySpeed;
      case 4:
        return !!data.learningDuration;
      case 5:
        return !!data.speakingLevel;
      case 6:
        return true; // Always valid (slider default)
      case 7:
        return data.barriers && data.barriers.length > 0;
      case 8:
        return data.focusAreas && data.focusAreas.length > 0;
      case 9:
        return !!data.discoverySource;
      case 10:
        return true;
      default:
        return true;
    }
  };

  const handleContinue = async () => {
    if (currentStep === 10) {
      try {
        const { currentLanguage } = useLanguageStore.getState();
        const { cefrLevel } = useLearningStore.getState();
        const onboardingMetadata = {
          full_name: data.name,
          country: data.country,
          native_language: data.nativeLanguage,
          app_language: currentLanguage,
          learn_language: data.learningLanguage,
          onboarding_data: {
            main_goal: data.mainGoal,
            fluency_speed: data.fluencySpeed,
            learning_duration: data.learningDuration,
            speaking_level: data.speakingLevel,
            confidence_level: data.confidenceLevel,
            cefr_level: cefrLevel,
            barriers: data.barriers,
            focus_areas: data.focusAreas,
            discovery_source: data.discoverySource,
            completed_at: new Date().toISOString(),
          },
        };

        // 1. Update User Profile Metadata
        await updateProfile(onboardingMetadata);

        // 2. Create Language Profile
        try {
          const nativeLangObj = getLanguageByCode(data.nativeLanguage);
          const targetLangObj = getLanguageByCode(data.learningLanguage);

          const nativeLangName = nativeLangObj?.name || "English";
          const targetLangName = targetLangObj?.name || "Hindi";

          // Auto-create profile
          await addProfile({
            name: `Learning ${targetLangName}`,
            native_language: nativeLangName,
            target_language: targetLangName,
            medium_language: nativeLangName, // Teach in native language
            preferred_accent: "American", // Default accent
          });

          // 3. Set Learning Store Languages (so app is ready to use)
          if (targetLangObj) setTargetLanguage(targetLangObj);
          if (nativeLangObj) setNativeLanguage(nativeLangObj);
        } catch (profileError) {
          console.error("Failed to auto-create profile:", profileError);
          // Continue anyway, user can create profile manually
        }

        resetOnboarding();
        // 4. Navigate to Language Tab to show the new profile
        // 4. Navigate to Talk Tab to start conversing
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

      // Sub-step 3 validation: check profile details (name, country)
      // Note: learningLanguage is validated in goToNextSubStep before reaching here
      if (!data.name || !data.country) {
        showAlert(
          t("common.incomplete"),
          t("onboarding.fillAllFields"),
          undefined,
          "warning",
        );
        return;
      }

      // All sub-steps complete, advance to next main step
      nextStep();
    } else {
      if (!isStepValid(currentStep)) return;
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
      safeGoBack(router, "/(auth)/login");
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
            onSubStepChange={setProfileSubStep}
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
        return <BarrierStep onAlert={showAlert} />;
      case 8:
        return <FocusStep onAlert={showAlert} />;
      case 9:
        return <DiscoveryStep />;
      case 10:
        return <CompletionStep />;
      default:
        return null;
    }
  };

  // Dynamic step configuration
  const getStepConfig = (step: number) => {
    switch (step) {
      case 2:
        return { title: t("onboarding.titles.goal") };
      case 3:
        return { title: t("onboarding.titles.fluency") };
      case 4:
        return { title: t("onboarding.titles.duration") };
      case 5:
        return { title: t("onboarding.titles.level") };
      case 6:
        return { title: t("onboarding.titles.confidence") };
      case 7:
        return { title: t("onboarding.titles.barriers") };
      case 8:
        return { title: t("onboarding.titles.focus") };
      case 9:
        return { title: t("onboarding.titles.discovery") };
      default:
        return null;
    }
  };

  const currentStepConfig = getStepConfig(currentStep);
  const isButtonDisabled = isSaving || !isStepValid(currentStep);

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
          <RainbowProgressBar
            currentStep={currentStep}
            totalSteps={10}
            subStep={profileSubStep}
            totalSubSteps={3}
          />
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
          {currentStepConfig?.title && (
            <OnboardingHeader
              title={currentStepConfig.title}
              subtitle={undefined}
            />
          )}
          {renderStep()}
        </ScrollView>
      )}

      {/* Continue Button */}
      <View className="p-4 bg-white">
        {/* Animated Border Line */}
        <AnimatedBorderLine visible={showBorder} />
        <AnimatedBorderLine visible={showBorder} />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleContinue}
          disabled={isButtonDisabled}
          className="w-full h-16 rounded-full overflow-hidden"
          style={
            !isButtonDisabled
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 3,
                }
              : {}
          }
        >
          {isButtonDisabled ? (
            <View className="flex-1 items-center justify-center bg-gray-100 rounded-full border border-gray-200">
              <Text className="text-gray-400 font-bold text-base">
                {isSaving ? t("onboarding.saving") : t("onboarding.continue")}
              </Text>
            </View>
          ) : (
            <RainbowBorder
              borderWidth={2}
              borderRadius={9999}
              className="flex-1"
              containerClassName="items-center justify-center"
              innerBackgroundClassName="bg-white"
            >
              <Text className="text-gray-900 font-bold text-base">
                {currentStep === 10
                  ? t("onboarding.startLearning")
                  : t("onboarding.continue")}
              </Text>
            </RainbowBorder>
          )}
        </TouchableOpacity>
        {currentStep === 9 && (
          <TouchableOpacity
            onPress={nextStep}
            className="items-center mt-4"
            disabled={isSaving}
          >
            <Text className="text-gray-400 font-medium">
              {t("onboarding.skip")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <AlertModal {...alertState} onClose={hideAlert} />
    </SafeAreaView>
  );
}
