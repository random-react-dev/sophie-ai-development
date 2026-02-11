import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { Button } from "@/components/common/Button";
import { checkEmailExists } from "@/services/supabase/auth";
import { useAuthStore } from "@/stores/authStore";
import { safeGoBack } from "@/utils/navigation";
import { Link, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const { forgotPassword, isLoading } = useAuthStore();
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showAlert("Error", "Please enter your email address.", undefined, "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showAlert("Invalid Email", "Please enter a valid email address.", undefined, "error");
      return;
    }

    try {
      const exists = await checkEmailExists(trimmedEmail);
      if (!exists) {
        showAlert(
          "No Account Found",
          "We couldn't find an account with this email. Try a different email or create a new account.",
          [
            { text: "Create Account", onPress: () => router.push("/(auth)/signup") },
            { text: "Try Again", style: "cancel" },
          ],
          "info",
        );
        return;
      }

      await forgotPassword(trimmedEmail);
      showAlert(
        "Check Your Email",
        "We've sent a password reset link to your email. Check your inbox.",
        [{ text: "Back to Login", onPress: () => safeGoBack(router, "/(auth)/login") }],
        "success",
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      showAlert("Error", errorMessage, undefined, "error");
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
          {/* Top Section - AuthHeader + White Card grouped together */}
          <View>
            <AuthHeader />

            {/* White Card */}
            <View className="bg-white rounded-3xl p-6 mt-8 shadow-sm border border-gray-100">
              {/* Title */}
              <View className="items-center mb-8">
                <Text className="text-2xl font-bold text-gray-900">
                  Reset Password
                </Text>
                <Text className="text-gray-500 text-sm mt-1 w-full text-center">
                  Enter your email to receive reset instructions
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

              {/* Reset Button - Rainbow */}
              <Button
                title={isLoading ? "Sending..." : "Send Reset Link"}
                onPress={handleReset}
                disabled={isLoading}
                variant="rainbow"
                className="mt-6 h-14"
              />
            </View>
          </View>

          {/* Bottom Section - Back to Login & Terms */}
          <View>
            {/* Back to Login */}
            <View className="items-center mb-6">
              <Link href="/login" asChild>
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center"
                >
                  <ArrowLeft size={18} color="black" />
                  <Text className="text-black font-bold text-base ml-2">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Terms */}
            <View className="items-center pb-6">
              <Text className="text-gray-400 text-xs text-center w-full">
                By continuing, you agree to our{" "}
                <Text className="text-gray-600 font-bold">
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text className="text-gray-600 font-bold">Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </SafeAreaView>
  );
}
