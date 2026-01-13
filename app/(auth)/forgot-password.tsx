import { AuthInput } from "@/components/auth/AuthInput";
import { AlertModal } from "@/components/common/AlertModal";
import { useAuthStore } from "@/stores/authStore";
import { Link, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const { forgotPassword, isLoading } = useAuthStore();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccessModal, setIsSuccessModal] = useState(false);

  const showAlert = (title: string, message: string, isSuccess = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setIsSuccessModal(isSuccess);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (isSuccessModal) {
      router.back();
    }
  };

  const handleReset = async () => {
    if (!email) {
      showAlert("Error", "Please enter your email address");
      return;
    }
    try {
      await forgotPassword(email);
      showAlert("Success", "Password reset link sent! Check your email.", true);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      showAlert("Error", errorMessage);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
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
                  <Text className="text-gray-500 text-base mt-1 w-full text-center">
                    Native speaker in your pocket
                  </Text>
                </View>

                {/* White Card */}
                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  {/* Title */}
                  <View className="items-center mb-8">
                    <Text className="text-3xl font-bold text-gray-900">
                      Reset Password
                    </Text>
                    <Text className="text-gray-500 mt-1 w-full text-center">
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

                  {/* Reset Button - Blue */}
                  <Pressable
                    onPress={handleReset}
                    disabled={isLoading}
                    className="bg-blue-500 py-4 rounded-full items-center mt-6 active:opacity-80"
                  >
                    <Text className="text-white font-bold text-base">
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Bottom Section */}
              <View>
                {/* Back to Login */}
                <View className="items-center py-6">
                  <Link href="/login" asChild>
                    <TouchableOpacity className="flex-row items-center">
                      <ArrowLeft size={18} color="black" />
                      <Text className="text-black font-bold text-base ml-2">
                        Back to Login
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>

                {/* Terms */}
                <View className="items-center pb-6">
                  <Text className="text-gray-400 text-sm text-center">
                    By continuing, you agree to our{" "}
                    <Text className="text-gray-600 font-bold">
                      Terms of Service
                    </Text>{" "}
                    and{" "}
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
        onClose={handleModalClose}
        type={isSuccessModal ? "success" : "error"}
      />
    </SafeAreaView>
  );
}
