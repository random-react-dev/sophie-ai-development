import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import React from 'react';
import { Text, View } from 'react-native';

export default function LanguageScreen() {
    const { signOut, user } = useAuthStore();

    return (
        <View className="flex-1 items-center justify-center bg-white space-y-8 p-6">
            <View className="items-center">
                <View className="w-24 h-24 bg-gray-200 rounded-full mb-4" />
                <Text className="text-2xl font-bold text-gray-800">{user?.email || 'Guest User'}</Text>
                <Text className="text-gray-500 mt-2">Language Settings Coming Soon</Text>
            </View>

            <Button title="Sign Out" variant="secondary" className="w-full" onPress={signOut} />
        </View>
    );
}
