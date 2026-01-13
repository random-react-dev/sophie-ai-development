import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BarrierStep } from "./components/BarrierStep";
import { CompletionStep } from "./components/CompletionStep";
import { ConfidenceStep } from "./components/ConfidenceStep";
import { DiscoveryStep } from "./components/DiscoveryStep";
import { DurationStep } from "./components/DurationStep";
import { FluencyStep } from "./components/FluencyStep";
import { FocusStep } from "./components/FocusStep";
import { GoalStep } from "./components/GoalStep";
import { LevelStep } from "./components/LevelStep";
import { ProfileStep } from "./components/ProfileStep";

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile, isLoading: isSaving } = useAuthStore();
  const { currentStep, nextStep, prevStep, data, resetOnboarding } =
    useOnboardingStore();

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
    } else {
      if (currentStep === 1 && (!data.name || !data.country)) {
        Alert.alert(
          "Incomplete",
          "Please enter your name and select a country."
        );
        return;
      }
      nextStep();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ProfileStep />;
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
          onPress={currentStep === 1 ? () => router.back() : prevStep}
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

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {renderStep()}
      </ScrollView>

      <View className="p-6 border-t border-gray-50 bg-white">
        <Button
          title={
            isSaving
              ? "Saving..."
              : currentStep === 10
              ? "Start Learning"
              : "Continue"
          }
          onPress={handleContinue}
          disabled={isSaving}
          className="h-14 rounded-2xl"
        />
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
