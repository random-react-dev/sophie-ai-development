import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { CountryPicker } from "@/components/auth/CountryPicker";
import { LanguagePicker } from "@/components/auth/LanguagePicker";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { AlertModal } from "@/components/common/AlertModal";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const { signUp, updateProfile, isLoading } = useAuthStore();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<
    "error" | "success" | "warning" | "info"
  >("info");

  const showAlert = (
    title: string,
    message: string,
    type: "error" | "success" | "warning" | "info" = "info",
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

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
      showAlert("Error", "Please fill in all fields", "error");
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Error", "Passwords do not match", "error");
      return;
    }
    try {
      await signUp(email, password);
      // With email confirmation disabled, user is logged in immediately
      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      showAlert("Signup Failed", message, "error");
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName || !country || !appLanguage || !learnLanguage) {
      showAlert("Error", "Please complete all profile details", "error");
      return;
    }
    if (!termsAccepted) {
      showAlert("Error", "You must accept the Terms and Conditions", "error");
      return;
    }
    try {
      await updateProfile({
        full_name: fullName,
        country,
        app_language: appLanguage,
        learn_language: learnLanguage,
      });
      router.replace("/(onboarding)/onboarding");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save profile";
      showAlert("Error", message, "error");
    }
  };

  const renderStep1 = () => (
    <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-gray-900">
          Create your account
        </Text>
        {/* <Text className="text-gray-500 mt-2 w-full text-center">
          Step 1 of 2 — Enter your details
        </Text> */}
      </View>

      <View>
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

        {/* Create Account Button */}
        <Button
          title={isLoading ? "Creating account..." : "Create Account"}
          onPress={handleSignup}
          disabled={isLoading}
          className="mt-6 h-14"
          variant="rainbow"
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
          variant="rainbow"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 justify-between">
          {/* Top Section - Brand (outside card) */}
          <AuthHeader />

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}

          <View className="items-center mb-6">
            <Text className="text-gray-400 w-full text-center">
              Already have an account?
            </Text>
            <Link href="/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-black font-medium underline text-lg">
                  Log in
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Terms */}
          <View className="items-center pb-6">
            <Text className="text-gray-400 text-sm w-full text-center">
              By continuing, you agree to our{" "}
              <Text className="text-gray-600 font-bold">Terms to Service</Text>
              {"\n"}and{" "}
              <Text className="text-gray-600 font-bold">Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        type={modalType}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}
