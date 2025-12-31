import { Link } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function SignupScreen() {
    return (
        <View className="flex-1 justify-center px-8 bg-white space-y-6">
            <View className="items-center mb-8">
                <Text className="text-3xl font-bold text-gray-800">Create Account</Text>
            </View>
            <Text className="text-center text-gray-500">Sign up feature is essentially the same as login (Magic Link) for this prototype.</Text>

            <Link href="/(auth)/login" asChild>
                <Text className="text-center text-blue-500 font-bold mt-4">Back to Login</Text>
            </Link>
        </View>
    );
}
