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
import {
  ProfileStep,
  ProfileStepRef,
} from "@/components/onboarding/ProfileStep";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useRef } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile, isLoading: isSaving } = useAuthStore();
  const { currentStep, nextStep, prevStep, data, resetOnboarding } =
    useOnboardingStore();

  // Ref for ProfileStep sub-step control
  const profileStepRef = useRef<ProfileStepRef>(null);

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
        router.replace("/(tabs)");
      } catch (error) {
        Alert.alert(
          "Error",
          "Failed to save your preferences. Please try again."
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
        Alert.alert(
          "Incomplete",
          "Please enter your name and select a country."
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
        return <ProfileStep ref={profileStepRef} />;
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
      <View className="flex-row items-center justify-between px-4 py-2">
        <TouchableOpacity
          onPress={handleBack}
          className="p-2"
          disabled={isSaving}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-sm font-medium text-gray-400">
            Step {currentStep} <Text className="text-gray-200">of 10</Text>
          </Text>
        </View>
        <View className="w-10" />
      </View>

      <View className="h-1 bg-gray-100 flex-row px-8 mb-8 mt-2">
        {[...Array(10)].map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-full mx-0.5 rounded-full ${
              i < currentStep ? "bg-blue-500" : "bg-gray-200"
            }`}
          />
        ))}
      </View>

      {currentStep === 1 ? (
        // ProfileStep uses FlatList internally, so we use View instead of ScrollView
        <View className="flex-1">{renderStep()}</View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          {renderStep()}
        </ScrollView>
      )}

      <View className="p-6 border-t border-gray-50 bg-white">
        {/* Continue Button with RainbowBorder */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleContinue}
          disabled={isSaving}
          className="w-full h-16 rounded-full overflow-hidden shadow-lg"
        >
          <RainbowBorder
            borderWidth={2}
            borderRadius={9999}
            className="flex-1"
            containerClassName="items-center justify-center"
            innerBackgroundClassName="bg-white"
          >
            <Text className="text-black font-bold text-lg">
              {isSaving
                ? "Saving..."
                : currentStep === 10
                ? "Start Learning"
                : "Continue"}
            </Text>
          </RainbowBorder>
        </TouchableOpacity>
        {currentStep === 9 && (
          <TouchableOpacity
            onPress={nextStep}
            className="items-center mt-4"
            disabled={isSaving}
          >
            <Text className="text-gray-400 font-medium">Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
