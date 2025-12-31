import { AuthInput } from '@/components/auth/AuthInput';
import { CountryPicker } from '@/components/auth/CountryPicker';
import { LanguagePicker } from '@/components/auth/LanguagePicker';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupScreen() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const { signUp, verifyOtp, updateProfile, isLoading } = useAuthStore();

    // Step 1: Account
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Step 2: Verification
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpInputs = useRef<(TextInput | null)[]>([]);
    const [resendTimer, setResendTimer] = useState(45);

    // Step 3: Profile
    const [fullName, setFullName] = useState('');
    const [country, setCountry] = useState('');
    const [appLanguage, setAppLanguage] = useState('');
    const [learnLanguage, setLearnLanguage] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 2 && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer]);

    const handleSignup = async () => {
        if (!email || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }
        try {
            await signUp(email, password);
            setStep(2);
        } catch (error: any) {
            Alert.alert("Signup Failed", error.message || "Something went wrong");
        }
    };

    const handleVerifyOtp = async () => {
        const token = otp.join('');
        if (token.length !== 6) {
            Alert.alert("Error", "Please enter the 6-digit code");
            return;
        }
        try {
            await verifyOtp(email, token);
            setStep(3);
        } catch (error: any) {
            Alert.alert("Verification Failed", error.message || "Invalid or expired code");
        }
    };

    const handleUpdateProfile = async () => {
        if (!fullName || !country || !appLanguage || !learnLanguage) {
            Alert.alert("Error", "Please complete all profile details");
            return;
        }
        if (!termsAccepted) {
            Alert.alert("Error", "You must accept the Terms and Conditions");
            return;
        }
        try {
            await updateProfile({
                full_name: fullName,
                country,
                app_language: appLanguage,
                learn_language: learnLanguage
            });
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to save profile");
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            otpInputs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputs.current[index - 1]?.focus();
        }
    };

    const renderStep1 = () => (
        <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
            <View className="items-center mb-8">
                <Text className="text-3xl font-bold text-gray-900">Create your account</Text>
                <Text className="text-gray-500 mt-2">Step 1 of 3 — Enter your details</Text>
            </View>

            <View className="space-y-5">
                <AuthInput
                    placeholder="Email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <View className="mt-4">
                    <AuthInput
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        rightElement={
                            <Link href="/forgot-password" asChild>
                                <TouchableOpacity>
                                    <Text className="text-blue-500 font-semibold text-sm">Forgot?</Text>
                                </TouchableOpacity>
                            </Link>
                        }
                    />
                </View>
                <View className="mt-4">
                    <AuthInput
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                </View>

                <Button
                    title={isLoading ? "Sending code..." : "Send verification code"}
                    onPress={handleSignup}
                    disabled={isLoading}
                    className="mt-6 h-14"
                />

                <View className="flex-row items-center my-6">
                    <View className="flex-1 h-[1px] bg-gray-200" />
                    <Text className="mx-4 text-gray-400 font-medium">Or continue with</Text>
                    <View className="flex-1 h-[1px] bg-gray-200" />
                </View>

                <SocialLoginButtons />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
            <View className="items-center mb-8">
                <Text className="text-3xl font-bold text-gray-900">Verify your email</Text>
                <Text className="text-gray-500 mt-2 text-center">
                    Step 2 of 3 — Enter the 6-digit verification code we sent to you{"\n"}
                    <Text className="text-blue-500">{email}</Text>
                </Text>
            </View>

            <View className="flex-row justify-between mb-8">
                {otp.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => { otpInputs.current[index] = ref; }}
                        className={`w-12 h-16 bg-gray-50 border ${digit ? 'border-blue-500' : 'border-gray-200'} rounded-xl text-center text-2xl font-bold text-gray-900`}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    />
                ))}
            </View>

            <View className="items-center mb-8">
                <Text className="text-gray-400">
                    Resend code in <Text className="text-gray-600 font-semibold">{`00:${resendTimer.toString().padStart(2, '0')}`}</Text>
                </Text>
            </View>

            <Button
                title={isLoading ? "Verifying..." : "Verify & Continue"}
                onPress={handleVerifyOtp}
                disabled={isLoading}
                className="h-14"
            />

            <TouchableOpacity onPress={() => setStep(1)} className="items-center mt-6">
                <Text className="text-blue-500 font-bold">Change email address</Text>
            </TouchableOpacity>
        </View>
    );

    const renderStep3 = () => (
        <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
            <View className="items-center mb-8">
                <Text className="text-3xl font-bold text-gray-900">Profile Setup</Text>
                <Text className="text-gray-500 mt-2">Step 3 of 3 — Finalize your account</Text>
            </View>

            <View className="space-y-5">
                <AuthInput
                    placeholder="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                />

                <View className="mt-4">
                    <CountryPicker
                        value={country}
                        onSelect={setCountry}
                    />
                </View>

                <View className="mt-4">
                    <LanguagePicker
                        label="Preferred Language"
                        value={appLanguage}
                        onSelect={setAppLanguage}
                        placeholder="Select UI Language"
                    />
                </View>

                <View className="mt-4">
                    <LanguagePicker
                        label="Language to Learn"
                        value={learnLanguage}
                        onSelect={setLearnLanguage}
                        placeholder="Select Target Language"
                    />
                </View>

                <TouchableOpacity
                    className="flex-row items-center mt-4"
                    onPress={() => setTermsAccepted(!termsAccepted)}
                >
                    <View className={`w-6 h-6 rounded border mr-3 items-center justify-center ${termsAccepted ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                        {termsAccepted && <Text className="text-white font-bold">✓</Text>}
                    </View>
                    <Text className="text-gray-600 flex-1 text-sm">
                        I accept the <Text className="text-blue-500 font-bold">Terms and Conditions</Text>
                    </Text>
                </TouchableOpacity>

                <Button
                    title={isLoading ? "Saving..." : "Finish Setup"}
                    onPress={handleUpdateProfile}
                    disabled={isLoading}
                    className="mt-8 h-14"
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-6">
                <View className="items-center mt-6 mb-10">
                    <Text className="text-4xl font-bold text-gray-900 mb-2">Sophie AI</Text>
                    <Text className="text-gray-500 text-lg text-center px-4">Native speaker in your pocket</Text>
                </View>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}

                <View className="items-center mb-10">
                    <Text className="text-gray-500 mb-1">Already have an account?</Text>
                    <Link href="/login" asChild>
                        <TouchableOpacity>
                            <Text className="text-blue-600 font-bold text-lg">Log in</Text>
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
