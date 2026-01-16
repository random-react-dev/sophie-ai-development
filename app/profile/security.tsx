import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { getRainbowColorScheme } from "@/utils/rainbowColors";
import { useRouter } from "expo-router";
import { Lock, Shield } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SecurityScreen() {
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Security" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-indigo-50 items-center justify-center mb-4">
                            <Shield size={32} color="#6366f1" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Security</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Protect your account
                        </Text>
                    </View>
                </View> */}

        {/* Security Items */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Authentication
          </Text>

          {/* Change Password Card */}
          <ProfileSettingCard
            title="Change Password"
            subtitle="Update your password regularly"
            icon={<Lock size={20} color={getRainbowColorScheme(0).iconColor} />}
            colorScheme={getRainbowColorScheme(0)}
            onPress={() => setShowPasswordModal(true)}
          />

          {/* Two-Factor Auth Card */}
          <View className="opacity-60">
            <ProfileSettingCard
              title="Two-Factor Authentication"
              icon={<Shield size={20} color={getRainbowColorScheme(1).iconColor} />}
              colorScheme={getRainbowColorScheme(1)}
              showArrow={false}
              rightElement={
                <Text className="text-xs text-gray-400 font-medium">
                  Not Enabled
                </Text>
              }
            />
          </View>
        </View>

        {/* Security Tips */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Security Tips
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-start gap-3 py-2">
              <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center mt-0.5">
                <Text className="text-green-600 text-xs font-bold">✓</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium">
                  Use a strong password
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Mix letters, numbers, and special characters
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-3 py-2 border-t border-gray-100">
              <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center mt-0.5">
                <Text className="text-blue-600 text-xs font-bold">i</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-medium">
                  Enable two-factor auth
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Coming soon for extra protection
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </SafeAreaView>
  );
}
