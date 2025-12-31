import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const { signIn, isLoading } = useAuthStore();

    const handleLogin = async () => {
        try {
            await signIn(email);
            Alert.alert("Check your email", "We sent you a login link!");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong");
        }
    };

    return (
        <View className="flex-1 justify-center px-8 bg-white space-y-6">
            <View className="items-center mb-8">
                <Text className="text-4xl font-bold text-blue-600 mb-2">Fluent-AI</Text>
                <Text className="text-gray-500 text-center">Master a language with AI conversations.</Text>
            </View>

            <View className="space-y-4">
                <TextInput
                    className="w-full bg-gray-100 p-4 rounded-xl text-gray-800"
                    placeholder="Email Address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <Button
                    title={isLoading ? "Sending Link..." : "Sign In with Email"}
                    onPress={handleLogin}
                    disabled={isLoading}
                />
            </View>

            <Link href="/(auth)/signup" asChild>
                <Text className="text-center text-gray-500 mt-4">Don&apos;t have an account? <Text className="text-blue-500 font-bold">Sign Up</Text></Text>
            </Link>

            {/* Dev Bypass */}
            <Button
                title="[Dev] Skip to Home"
                variant="secondary"
                className="mt-8 opacity-50"
                onPress={() => router.replace('/(tabs)')}
            />
        </View>
    );
}
