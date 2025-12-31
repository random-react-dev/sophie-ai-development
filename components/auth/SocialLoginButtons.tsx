import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
// Assuming we might use actual SVG assets or Lucide icons later, but for specific brand logos, images or custom SVGs are better.
// For prototype, we'll use text or simple placeholders if assets aren't available, but let's try to make it look decent.
// Since we don't have local assets for Google/Apple logos readily confirmed, we'll use a clean text/icon approach.

export function SocialLoginButtons() {
    const handleSocialLogin = (provider: string) => {
        Alert.alert("Coming Soon", `${provider} login is not yet implemented in this prototype.`);
    };

    return (
        <View className="space-y-4 w-full">
            <View className="flex-row items-center justify-center my-2">
                <View className="h-[1px] flex-1 bg-gray-200" />
                <Text className="mx-4 text-gray-400 text-sm font-medium">OR</Text>
                <View className="h-[1px] flex-1 bg-gray-200" />
            </View>

            <TouchableOpacity
                onPress={() => handleSocialLogin('Google')}
                className="w-full flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50"
            >
                {/* Placeholder for Google G logo - typically colorful */}
                <Text className="text-lg font-bold mr-2 text-blue-500">G</Text>
                <Text className="text-gray-700 font-semibold text-base">Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleSocialLogin('Apple')}
                className="w-full flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50"
            >
                {/* Placeholder for Apple logo */}
                <Text className="text-lg font-bold mr-2"></Text>
                <Text className="text-gray-700 font-semibold text-base">Continue with Apple</Text>
            </TouchableOpacity>
        </View>
    );
}
