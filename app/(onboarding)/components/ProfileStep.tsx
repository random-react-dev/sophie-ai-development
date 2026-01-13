import { AuthInput } from "@/components/auth/AuthInput";
import { CountryPicker } from "@/components/auth/CountryPicker";
import { LanguagePicker } from "@/components/auth/LanguagePicker";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Text, View } from "react-native";

export const ProfileStep = () => {
  const { data, updateData } = useOnboardingStore();

  return (
    <View className="flex-1 px-6">
      <View className="mb-10">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Let&apos;s get to know you
        </Text>
        <Text className="text-gray-500 text-base leading-6">
          Just a few details to personalize your learning experience and
          profile.
        </Text>
      </View>

      <View className="space-y-5">
        <View>
          <AuthInput
            placeholder="Full Name"
            value={data.name}
            onChangeText={(text) => updateData({ name: text })}
            autoCapitalize="words"
          />
        </View>

        <View className="mt-4">
          <CountryPicker
            value={data.country}
            onSelect={(country) => updateData({ country })}
          />
        </View>

        <View className="mt-4">
          <LanguagePicker
            label="Native Language"
            value={data.nativeLanguage}
            onSelect={(lang) => updateData({ nativeLanguage: lang })}
            placeholder="Select your native language"
          />
        </View>

        <View className="mt-4">
          <LanguagePicker
            label="Preferred Language"
            value={data.preferredLanguage}
            onSelect={(lang) => updateData({ preferredLanguage: lang })}
            placeholder="Select app language"
          />
        </View>
      </View>
    </View>
  );
};
