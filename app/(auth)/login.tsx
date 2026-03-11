import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { AlertModal } from "@/components/common/AlertModal";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, isLoading } = useAuthStore();

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

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Error", "Please fill in all fields", "error");
      return;
    }
    try {
      await signIn(email, password);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      showAlert("Login Failed", errorMessage, "error");
    }
  };

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

          {/* White Card */}
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
            {/* Welcome */}
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-gray-900">
                Welcome back
              </Text>
              <Text className="text-gray-500 text-sm mt-1 w-full text-center">
                Log in to continue learning
              </Text>
            </View>

            {/* Form */}
            <View>
              {/* Email Input */}
              <AuthInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="auth-email-input"
              />

              {/* Password Input */}
              <View className="mt-3">
                <AuthInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  testID="auth-password-input"
                />
                {/* Forgot Password - below and right-aligned */}
                <View className="items-end mt-2">
                  <Link href="/forgot-password" asChild>
                    <TouchableOpacity activeOpacity={0.7}>
                      <Text className="text-black text-sm font-medium">
                        Forgot Password?
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>

              {/* Login Button - Rainbow */}
              <Button
                title={isLoading ? "Logging in..." : "Login"}
                onPress={handleLogin}
                disabled={isLoading}
                variant="rainbow"
                className="mt-6 h-14"
                testID="auth-login-button"
              />

              {/* Social Login */}
              <SocialLoginButtons />
            </View>
          </View>

          {/* Bottom Section - Sign Up */}
          <View className="items-center mb-6">
            <Text className="text-gray-400 w-full text-center">
              Don&apos;t have an account?{" "}
            </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text className="text-black underline font-medium text-base">
                  Sign up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Terms */}
          <View className="items-center pb-6">
            <Text className="text-gray-400 text-xs text-center w-full">
              By continuing, you agree to our{" "}
              <Text className="text-gray-600 font-bold">Terms of Service</Text>
              {"\n"}and{" "}
              <Text className="text-gray-600 font-bold">Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Alert Modal */}
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
