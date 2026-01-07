import { AuthInput } from "@/components/auth/AuthInput";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      await signIn(email, password);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      Alert.alert("Login Failed", errorMessage);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1 px-6 justify-between">
            {/* Top Section - Logo & Brand */}
            <View className="items-center mt-8">
              {/* App Icon */}
              <View className="w-14 h-14 bg-black rounded-2xl items-center justify-center mb-3">
                <MessageCircle size={28} color="#FFFFFF" />
              </View>
              <Text className="text-3xl font-bold text-gray-900">
                Sophie AI
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Native speaker in your pocket
              </Text>
            </View>

            {/* Middle Section - Form */}
            <View className="flex-1 justify-center">
              {/* Welcome */}
              <View className="items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900">
                  Welcome back
                </Text>
                <Text className="text-gray-500 mt-1">
                  Log in to continue learning
                </Text>
              </View>

              {/* Form */}
              <View>
                <AuthInput
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View className="mt-3">
                  <AuthInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <View className="items-end mt-3">
                    <Link href="/forgot-password" asChild>
                      <TouchableOpacity>
                        <Text className="text-black font-bold text-sm">
                          Forgot Password?
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>

                {/* Login Button */}
                <Button
                  title={isLoading ? "Logging in..." : "Login"}
                  onPress={handleLogin}
                  disabled={isLoading}
                  variant="dark"
                  className="mt-5 shadow-lg shadow-black/20"
                />

                {/* Social Login */}
                <SocialLoginButtons />
              </View>
            </View>

            {/* Bottom Section - Sign Up & Terms */}
            <View className="pb-4">
              {/* Sign Up */}
              <View className="items-center mb-4">
                <Text className="text-gray-500">
                  Don&apos;t have an account?
                </Text>
                <Link href="/signup" asChild>
                  <TouchableOpacity className="mt-1">
                    <Text className="text-black font-bold text-base">
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Terms */}
              <View className="items-center">
                <Text className="text-gray-500 text-xs text-center">
                  By continuing, you agree to our{" "}
                  <Text className="text-black font-medium">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text className="text-black font-medium">Privacy Policy</Text>
                </Text>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
