import { useRouter } from "expo-router";
import { ArrowLeft, Scale } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsOfServiceScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={["top"]}>
            {/* Header */}
            <View className="px-4 py-4 flex-row items-center bg-white border-b border-gray-100">
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.back()}
                    className="mr-4 p-2 -ml-2"
                >
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Terms of Service</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Hero Section */}
                <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
                            <Scale size={32} color="#64748b" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Terms of Service</Text>
                        <Text className="text-sm text-gray-500 mt-1 text-center">
                            The terms and conditions for using Sophie
                        </Text>
                    </View>
                </View>

                {/* Content Section */}
                <View className="mx-4 mt-6 bg-white rounded-2xl p-6 shadow-sm">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        Last Updated: January 13, 2026
                    </Text>

                    <View className="mb-6">
                        <Text className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</Text>
                        <Text className="text-gray-600 leading-6">
                            By accessing and using this application, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-lg font-bold text-gray-900 mb-2">2. Use of Service</Text>
                        <Text className="text-gray-600 leading-6">
                            You agree to use this application for personal, non-commercial language learning purposes only. You must not use the services for any illegal or unauthorized purpose.
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-lg font-bold text-gray-900 mb-2">3. User Conduct</Text>
                        <Text className="text-gray-600 leading-6">
                            Users are expected to interact with the AI assistant respectfully. Any attempt to exploit, harm, or bypass the application&apos;s intended functionality is strictly prohibited.
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-lg font-bold text-gray-900 mb-2">4. Intellectual Property</Text>
                        <Text className="text-gray-600 leading-6">
                            The application, its content, and AI models are protected by copyright and other intellectual property laws. You may not reproduce or distribute any part of the service without permission.
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-lg font-bold text-gray-900 mb-2">5. AI Disclaimer</Text>
                        <Text className="text-gray-600 leading-6">
                            Our service provides AI-generated content for educational purposes. While we strive for accuracy, the AI may occasionally provide incorrect information. Users are encouraged to verify important details.
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-lg font-bold text-gray-900 mb-2">6. Limitation of Liability</Text>
                        <Text className="text-gray-600 leading-6">
                            We are not liable for any direct, indirect, or consequential damages resulting from your use of the application or any information provided by the AI assistant.
                        </Text>
                    </View>

                    <View>
                        <Text className="text-lg font-bold text-gray-900 mb-2">7. Changes to Terms</Text>
                        <Text className="text-gray-600 leading-6">
                            We reserve the right to modify these terms at any time. Your continued use of the application after changes are posted constitutes your acceptance of the new terms.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
