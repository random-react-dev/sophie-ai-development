import { Stack } from 'expo-router';

export default function ProfileLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="preferences" />
            <Stack.Screen name="account" />
            <Stack.Screen name="security" />
            <Stack.Screen name="progress" />
            <Stack.Screen name="support" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="subscription" />
        </Stack>
    );
}
