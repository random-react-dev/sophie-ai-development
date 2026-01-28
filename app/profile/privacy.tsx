import ProfileHeader from "@/components/profile/ProfileHeader";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Privacy Policy" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero Section */}
        {/* <View className="mx-4 mt-6">
          <View className="bg-surface rounded-2xl p-6 shadow-sm items-center">
            <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Shield size={32} color="#64748b" />
            </View>
            <Text className="text-xl font-bold text-gray-900">
              Privacy Policy
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              How we handle and protect your personal information
            </Text>
          </View>
        </View> */}

        {/* Content Section */}
        <View className="mx-4 mt-6 bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Last Updated: January 13, 2026
          </Text>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              1. Information We Collect
            </Text>
            <Text className="text-gray-600 leading-6">
              We collect information to provide better services to all our
              users. This includes account details like your name, email, and
              preferred languages, as well as usage data to improve our AI
              models.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              2. How We Use Data
            </Text>
            <Text className="text-gray-600 leading-6">
              Your data is used to personalize your learning experience, track
              progress, and refine our AI&apos;s accuracy. We do not sell your
              personal data to third parties.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              3. AI Interaction
            </Text>
            <Text className="text-gray-600 leading-6">
              Conversations and inputs provided within the app are processed to
              generate AI responses. This data may be used in an anonymized way
              to train and improve the language learning models.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              4. Data Security
            </Text>
            <Text className="text-gray-600 leading-6">
              We implement industry-standard security measures to protect your
              information from unauthorized access, alteration, disclosure, or
              destruction.
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              5. Your Rights
            </Text>
            <Text className="text-gray-600 leading-6">
              You have the right to access, correct, or delete your personal
              information at any time through the account settings or by
              contacting our support team.
            </Text>
          </View>

          <View>
            <Text className="text-base font-bold text-gray-900 mb-2">
              6. Contact Information
            </Text>
            <Text className="text-gray-600 leading-6">
              If you have questions about this Privacy Policy, please contact us
              at support@fluentai.com.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
