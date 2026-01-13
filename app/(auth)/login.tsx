import { AuthInput } from "@/components/auth/AuthInput";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { AlertModal } from "@/components/common/AlertModal";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "expo-router";
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, isLoading } = useAuthStore();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("Error", "Please fill in all fields");
      return;
    }
    try {
      await signIn(email, password);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      showAlert("Login Failed", errorMessage);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 px-6 justify-between">
              {/* Top Section - Brand (outside card) */}
              <View className="items-center mt-12 mb-6">
                <Text className="text-4xl font-bold text-gray-900">
                  Sophie AI
                </Text>
                <Text className="text-gray-500 text-base mt-1">
                  Native speaker in your pocket
                </Text>
              </View>

              {/* White Card */}
              <View className="bg-white rounded-3xl p-6 shadow-sm">
                {/* Welcome */}
                <View className="items-center mb-12">
                  <Text className="text-2xl font-bold text-gray-900">
                    Welcome back
                  </Text>
                  <Text className="text-gray-500 mt-1">
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
                  />

                  {/* Password Input */}
                  <View className="mt-3">
                    <AuthInput
                      placeholder="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                    {/* Forgot Password - below and right-aligned */}
                    <View className="items-end mt-2">
                      <Link href="/forgot-password" asChild>
                        <TouchableOpacity>
                          <Text className="text-blue-500 text-sm font-bold">
                            Forgot password?
                          </Text>
                        </TouchableOpacity>
                      </Link>
                    </View>
                  </View>

                  {/* Login Button - Black */}
                  <Pressable
                    onPress={handleLogin}
                    disabled={isLoading}
                    className="bg-blue-500 py-4 rounded-full items-center mt-6 active:opacity-80"
                  >
                    <Text className="text-white font-bold text-base">
                      {isLoading ? "Logging in..." : "Login"}
                    </Text>
                  </Pressable>

                  {/* Social Login */}
                  <SocialLoginButtons />
                </View>
              </View>

              {/* Bottom Section - Sign Up */}
              <View className="items-center py-4">
                <Text className="text-black font-bold text-base">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" asChild>
                    <Text className="text-blue-500 font-bold text-base underline">
                      Sign up
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
