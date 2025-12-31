import { AuthInput } from '@/components/auth/AuthInput';
import { CountryPicker } from '@/components/auth/CountryPicker';
import { LanguagePicker } from '@/components/auth/LanguagePicker';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function SignupScreen() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [country, setCountry] = useState('');
    const [appLanguage, setAppLanguage] = useState('');
    const [learnLanguage, setLearnLanguage] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const { signUp, isLoading } = useAuthStore();

    const handleSignup = async () => {
        if (!fullName || !email || !password || !confirmPassword || !country || !appLanguage || !learnLanguage) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        if (!termsAccepted) {
            Alert.alert("Error", "You must accept the Terms and Conditions");
            return;
        }

        try {
            await signUp(email, password, {
                full_name: fullName,
                country,
                app_language: appLanguage,
                learn_language: learnLanguage
            });
            Alert.alert("Success", "Account created! Please check your email to verify.");
        } catch (error: any) {
            Alert.alert("Signup Failed", error.message || "Something went wrong");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6">
                <View className="items-center mt-6 mb-8">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">Sophie AI</Text>
                    <Text className="text-gray-500">Native speaker in your pocket</Text>
                </View>

                <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
                    <View className="items-center mb-6">
                        <Text className="text-2xl font-bold text-gray-900">Create account</Text>
                        <Text className="text-gray-500 mt-1">Start your language journey</Text>
                    </View>

                    <View className="space-y-4">
                        <AuthInput
                            placeholder="Full Name"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                        />
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
                        />
                        <AuthInput
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />

                        <CountryPicker
                            value={country}
                            onSelect={setCountry}
                        />

                        <LanguagePicker
                            label="Preferred Language"
                            value={appLanguage}
                            onSelect={setAppLanguage}
                            placeholder="Select UI Language"
                        />

                        <LanguagePicker
                            label="Language to Learn"
                            value={learnLanguage}
                            onSelect={setLearnLanguage}
                            placeholder="Select Target Language"
                        />

                        <TouchableOpacity
                            className="flex-row items-center mt-2"
                            onPress={() => setTermsAccepted(!termsAccepted)}
                        >
                            <View className={`w-6 h-6 rounded border mr-3 items-center justify-center ${termsAccepted ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                {termsAccepted && <Text className="text-white font-bold">✓</Text>}
                            </View>
                            <Text className="text-gray-600 flex-1">
                                I accept the <Text className="text-blue-500 font-bold">Terms and Conditions</Text>
                            </Text>
                        </TouchableOpacity>

                        <Button
                            title={isLoading ? "Creating account..." : "Create Account"}
                            onPress={handleSignup}
                            disabled={isLoading}
                            className="mt-4"
                        />
                    </View>
                </View>

                <View className="items-center mb-8">
                    <Text className="text-gray-500 mb-1">Already have an account?</Text>
                    <Link href="/(auth)/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-blue-600 font-bold text-lg">Log in</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
