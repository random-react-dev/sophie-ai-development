import { AuthInput } from '@/components/auth/AuthInput';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, Text, View } from 'react-native';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const { forgotPassword, isLoading } = useAuthStore();

    const handleReset = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email address");
            return;
        }
        try {
            await forgotPassword(email);
            Alert.alert("Success", "Password reset link sent! Check your email.");
            router.back();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 px-6 pt-10">
                <Link href="/(auth)/login" asChild>
                    <Text className="text-blue-500 text-lg mb-8">← Back to Login</Text>
                </Link>

                <View className="mb-8">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">Reset Password</Text>
                    <Text className="text-gray-500 text-lg">Enter your email to receive specific instructions.</Text>
                </View>

                <View className="space-y-6">
                    <AuthInput
                        placeholder="Email address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Button
                        title={isLoading ? "Sending..." : "Send Reset Link"}
                        onPress={handleReset}
                        disabled={isLoading}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
