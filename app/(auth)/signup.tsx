import { AuthInput } from "@/components/auth/AuthInput";
import { CountryPicker } from "@/components/auth/CountryPicker";
import { LanguagePicker } from "@/components/auth/LanguagePicker";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const { signUp, updateProfile, isLoading } = useAuthStore();

  // Step 1: Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: Profile
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [appLanguage, setAppLanguage] = useState("");
  const [learnLanguage, setLearnLanguage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    try {
      await signUp(email, password);
      // With email confirmation disabled, user is logged in immediately
      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      Alert.alert("Signup Failed", message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName || !country || !appLanguage || !learnLanguage) {
      Alert.alert("Error", "Please complete all profile details");
      return;
    }
    if (!termsAccepted) {
      Alert.alert("Error", "You must accept the Terms and Conditions");
      return;
    }
    try {
      await updateProfile({
        full_name: fullName,
        country,
        app_language: appLanguage,
        learn_language: learnLanguage,
      });
      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save profile";
      Alert.alert("Error", message);
    }
  };

  const renderStep1 = () => (
    <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-gray-900">
          Create your account
        </Text>
        <Text className="text-gray-500 mt-2 w-full text-center">
          Step 1 of 2 — Enter your details
        </Text>
      </View>

      <View className="space-y-5">
        <AuthInput
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View className="mt-4">
          <AuthInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            rightElement={
              <Link href="/forgot-password" asChild>
                <TouchableOpacity>
                  <Text className="text-blue-500 font-semibold text-sm">
                    Forgot?
                  </Text>
                </TouchableOpacity>
              </Link>
            }
          />
        </View>
        <View className="mt-4">
          <AuthInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <Button
          title={isLoading ? "Creating account..." : "Create Account"}
          onPress={handleSignup}
          disabled={isLoading}
          className="mt-6 h-14"
        />

        <SocialLoginButtons />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-gray-900">Profile Setup</Text>
        <Text className="text-gray-500 mt-2 w-full text-center">
          Step 2 of 2 — Finalize your account
        </Text>
      </View>

      <View className="space-y-5">
        <AuthInput
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        <View className="mt-4">
          <CountryPicker value={country} onSelect={setCountry} />
        </View>

        <View className="mt-4">
          <LanguagePicker
            label="Preferred Language"
            value={appLanguage}
            onSelect={setAppLanguage}
            placeholder="Select UI Language"
          />
        </View>

        <View className="mt-4">
          <LanguagePicker
            label="Language to Learn"
            value={learnLanguage}
            onSelect={setLearnLanguage}
            placeholder="Select Target Language"
          />
        </View>

        <TouchableOpacity
          className="flex-row items-center mt-4"
          onPress={() => setTermsAccepted(!termsAccepted)}
        >
          <View
            className={`w-6 h-6 rounded border mr-3 items-center justify-center ${
              termsAccepted
                ? "bg-blue-500 border-blue-500"
                : "border-gray-300 bg-white"
            }`}
          >
            {termsAccepted && <Text className="text-white font-bold">✓</Text>}
          </View>
          <Text className="text-gray-600 flex-1 text-sm">
            I accept the{" "}
            <Text className="text-blue-500 font-bold">
              Terms and Conditions
            </Text>
          </Text>
        </TouchableOpacity>

        <Button
          title={isLoading ? "Saving..." : "Finish Setup"}
          onPress={handleUpdateProfile}
          disabled={isLoading}
          className="mt-8 h-14"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6">
        <View className="items-center mt-6 mb-10">
          <Text className="text-4xl font-bold text-gray-900 mb-2">
            Sophie AI
          </Text>
          <Text className="text-gray-500 text-lg w-full text-center px-4">
            Native speaker in your pocket
          </Text>
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}

        <View className="items-center mb-6">
          <Text className="text-gray-500 w-full text-center">
            Already have an account?
          </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold text-lg">Log in</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Spacer to push Terms to bottom */}
        <View className="flex-1" />

        {/* Terms */}
        <View className="items-center">
          <Text className="text-gray-400 text-sm w-full text-center">
            By continuing, you agree to our{" "}
            <Text className="text-gray-600 font-bold">Terms to Service</Text>
            {"\n"}and{" "}
            <Text className="text-gray-600 font-bold">Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
