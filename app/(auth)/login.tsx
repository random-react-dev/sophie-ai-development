import { AuthInput } from '@/components/auth/AuthInput';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signIn, isLoading } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        try {
            await signIn(email, password);
            // Navigation handled by auth listener or we can manually replace
            // router.replace('/(tabs)'); 
        } catch (error: any) {
            Alert.alert("Login Failed", error.message || "Something went wrong");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6">
                <View className="items-center mt-10 mb-12">
                    <Text className="text-4xl font-bold text-gray-900 mb-2">Sophie AI</Text>
                    <Text className="text-gray-500 text-lg">Native speaker in your pocket</Text>
                </View>

                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
                    <View className="items-center mb-6">
                        <Text className="text-2xl font-bold text-gray-900">Welcome back</Text>
                        <Text className="text-gray-500 mt-1">Log in to continue learning</Text>
                    </View>

                    <View className="space-y-4">
                        <AuthInput
                            placeholder="Email address"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <AuthInput
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            rightElement={
                                <Link href={"/(auth)/forgot-password" as any}>
                                    <Text className="text-blue-500 font-semibold text-sm">Forgot password?</Text>
                                </Link>
                            }
                        />

                        <Button
                            title={isLoading ? "Logging in..." : "Login"}
                            onPress={handleLogin}
                            disabled={isLoading}
                            className="mt-2"
                        />

                        <SocialLoginButtons />
                    </View>
                </View>

                <View className="items-center mb-8">
                    <Text className="text-gray-500 mb-1">Don&apos;t have an account?</Text>
                    <Link href="/(auth)/signup" asChild>
                        <TouchableOpacity>
                            <Text className="text-blue-600 font-bold text-lg">Sign up</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                <View className="flex-1 justify-end items-center mb-4">
                    <Text className="text-gray-400 text-xs text-center px-8">
                        By continuing, you agree to our Terms to Service and Privacy Policy
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
