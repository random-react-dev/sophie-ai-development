import { AuthInput } from "@/components/auth/AuthInput";
import { CountryPicker } from "@/components/auth/CountryPicker";
import { LanguagePicker } from "@/components/auth/LanguagePicker";
import { AlertModal } from "@/components/common/AlertModal";
import { useAuthStore } from "@/stores/authStore";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

// Google Logo Component
function GoogleLogo() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// Apple Logo Component
function AppleLogo() {
  return (
    <Svg width={26} height={26} viewBox="0 0 16 16" fill="#000000">
      <Path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
    </Svg>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { signUp, verifyOtp, updateProfile, isLoading } = useAuthStore();

  // Step 1: Email
  const [email, setEmail] = useState("");

  // Step 2: Verification
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpInputs = useRef<(TextInput | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(45);

  // Step 3: Profile
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [appLanguage, setAppLanguage] = useState("");
  const [learnLanguage, setLearnLanguage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSendCode = async () => {
    if (!email) {
      showAlert("Error", "Please enter your email address");
      return;
    }
    try {
      await signUp(email, "temp-password-123"); // Temporary password for OTP flow
      setStep(2);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      showAlert("Error", errorMessage);
    }
  };

  const handleVerifyOtp = async () => {
    const token = otp.join("");
    if (token.length !== 6) {
      showAlert("Error", "Please enter the 6-digit code");
      return;
    }
    try {
      await verifyOtp(email, token);
      setStep(3);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid or expired code";
      showAlert("Verification Failed", errorMessage);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName || !country || !appLanguage || !learnLanguage) {
      showAlert("Error", "Please complete all profile details");
      return;
    }
    if (!termsAccepted) {
      showAlert("Error", "You must accept the Terms and Conditions");
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save profile";
      showAlert("Error", errorMessage);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(
      "Coming Soon",
      `${provider} login is not yet implemented in this prototype.`
    );
  };

  // Step 1: Enter Email
  const renderStep1 = () => (
    <View className="">
      {/* White Card */}
      <View className="bg-white rounded-3xl p-6 shadow-sm">
        {/* Title */}
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Create your account
          </Text>
          <Text className="text-gray-500 mt-1">
            Step 1 of 3 – Enter your email
          </Text>
        </View>

        {/* Email Input */}
        <AuthInput
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Send Code Button */}
        <Pressable
          onPress={handleSendCode}
          disabled={isLoading}
          className="bg-blue-500 py-4 rounded-2xl items-center mt-6 active:opacity-80"
        >
          <Text className="text-white font-bold text-base">
            {isLoading ? "Sending..." : "Send verification code"}
          </Text>
        </Pressable>
      </View>

      {/* Social Login (Outside Card) */}
      <View>
        <Text className="text-black text-center font-bold py-5">
          Or continue with
        </Text>

        {/* Google Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSocialLogin("Google")}
          className="w-full flex-row items-center bg-white rounded-2xl py-5 px-5 mb-5 shadow-2xl"
        >
          <GoogleLogo />
          <Text className="flex-1 text-center text-black font-bold text-base">
            Continue with Google
          </Text>
        </TouchableOpacity>

        {/* Apple Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSocialLogin("Apple")}
          className="w-full flex-row items-center bg-white rounded-2xl py-5 px-5 shadow-2xl"
        >
          <AppleLogo />
          <Text className="flex-1 text-center text-black font-bold text-base">
            Continue with Apple
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 2: Verify OTP
  const renderStep2 = () => (
    <View className="flex-1 justify-center">
      {/* White Card */}
      <View className="bg-white rounded-3xl p-6 shadow-sm">
        {/* Title */}
        <View className="mb-10">
          <Text className="text-3xl font-bold text-gray-900">
            Verify your email
          </Text>
          <Text className="text-gray-500 mt-1">Step 2 of 3</Text>
          <Text className="text-black font-bold mt-5">
            Enter the 6-digit verification code sent to{" "}
            <Text className="text-blue-500 underline font-bold">{email}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View className="flex-row justify-between mb-6">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                otpInputs.current[index] = ref;
              }}
              className={`w-12 h-14 bg-gray-50 border ${
                digit ? "border-blue-500" : "border-gray-300"
              } rounded-xl text-center text-xl font-bold text-blue-500`}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleOtpKeyPress(e, index)}
            />
          ))}
        </View>

        <View className="items-center mb-6">
          <Text className="text-gray-400">
            Resend code in{" "}
            <Text className="text-gray-600 font-semibold">
              {`00:${resendTimer.toString().padStart(2, "0")}`}
            </Text>
          </Text>
        </View>

        {/* Verify Button */}
        <Pressable
          onPress={handleVerifyOtp}
          disabled={isLoading}
          className="bg-blue-500 py-4 rounded-full items-center active:opacity-80"
        >
          <Text className="text-white font-bold text-base">
            {isLoading ? "Verifying..." : "Verify & Continue"}
          </Text>
        </Pressable>

        <TouchableOpacity
          onPress={() => setStep(1)}
          className="items-center mt-5"
        >
          <Text className="text-black font-bold">Change email address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Profile
  const renderStep3 = () => (
    <View className="flex-1 justify-center">
      {/* White Card */}
      <View className="bg-white rounded-3xl p-6 shadow-sm">
        {/* Title */}
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Complete your profile
          </Text>
          <Text className="text-gray-500 mt-1">
            Step 3 of 3 — Tell us about you
          </Text>
        </View>

        {/* Form */}
        <View>
          <AuthInput
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <View className="mt-3">
            <CountryPicker value={country} onSelect={setCountry} />
          </View>
          <View className="mt-3">
            <LanguagePicker
              value={appLanguage}
              onSelect={setAppLanguage}
              label="App Language"
            />
          </View>
          <View className="mt-3">
            <LanguagePicker
              value={learnLanguage}
              onSelect={setLearnLanguage}
              label="Language to Learn"
            />
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            onPress={() => setTermsAccepted(!termsAccepted)}
            className="flex-row items-center mt-5"
          >
            <View
              className={`w-5 h-5 rounded border ${
                termsAccepted
                  ? "bg-blue-500 border-black"
                  : "bg-white border-gray-300"
              } items-center justify-center mr-3`}
            >
              {termsAccepted && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>
            <Text className="text-gray-600 flex-1 text-sm">
              I accept the{" "}
              <Text className="text-black font-bold">Terms and Conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Complete Button */}
          <Pressable
            onPress={handleUpdateProfile}
            disabled={isLoading}
            className="bg-gray-900 py-4 rounded-full items-center mt-6 active:opacity-80"
          >
            <Text className="text-white font-bold text-base">
              {isLoading ? "Saving..." : "Complete Setup"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            className="px-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-between">
              {/* Top Section */}
              <View>
                {/* Logo & Brand (Outside Card) */}
                <View className="items-center py-12">
                  <Text className="text-4xl font-bold text-gray-900">
                    Sophie AI
                  </Text>
                  <Text className="text-gray-500 text-base mt-1">
                    Native speaker in your pocket
                  </Text>
                </View>

                {/* Step Content */}
                <View>
                  {step === 1 && renderStep1()}
                  {step === 2 && renderStep2()}
                  {step === 3 && renderStep3()}
                </View>
              </View>

              {/* Bottom Section */}
              <View>
                {/* Login Link */}
                <View className="items-center py-4">
                  <Text className="text-gray-500 font-bold text-base">
                    Already have an account?{" "}
                    <Link href="/login" asChild>
                      <Text className="text-black font-bold text-base underline">
                        Log in
                      </Text>
                    </Link>
                  </Text>
                </View>

                {/* Terms */}
                <View className="items-center pb-6">
                  <Text className="text-gray-400 text-sm text-center">
                    By continuing, you agree to our{" "}
                    <Text className="text-gray-600 font-bold">
                      Terms to Service
                    </Text>
                    {"\n"}and{" "}
                    <Text className="text-gray-600 font-bold">
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Alert Modal */}
      <AlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}
