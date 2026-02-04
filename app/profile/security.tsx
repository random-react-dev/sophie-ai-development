import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import {
  disabledColorScheme,
  getRainbowColorScheme,
} from "@/utils/rainbowColors";
import { Info, Lock, Shield, ShieldCheck } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SecurityScreen() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.security_screen.title")} />

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
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.security_screen.auth_section")}
          </Text>

          {/* Change Password Card */}
          <ProfileSettingCard
            title={t("profile.security_screen.change_password.title")}
            subtitle={t("profile.security_screen.change_password.subtitle")}
            icon={<Lock size={20} color={getRainbowColorScheme(0).iconColor} />}
            colorScheme={getRainbowColorScheme(0)}
            onPress={() => setShowPasswordModal(true)}
          />

          {/* Two-Factor Auth Card */}
          <ProfileSettingCard
            title={t("profile.security_screen.two_factor.title")}
            icon={<Shield size={20} color={disabledColorScheme.iconColor} />}
            colorScheme={disabledColorScheme}
            showArrow={false}
            rightElement={
              <Text className="text-xs text-gray-400 font-medium">
                {t("profile.security_screen.two_factor.status")}
              </Text>
            }
          />
        </View>

        {/* Security Tips */}
        <View className="mx-4 mt-8">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">
            {t("profile.security_screen.tips_section")}
          </Text>

          <View className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm">
            <View className="flex-row items-start gap-4 mb-6">
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-green-50">
                <ShieldCheck size={22} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base">
                  {t("profile.security_screen.tips.strong_password.title")}
                </Text>
                <Text className="text-gray-500 text-sm mt-1 leading-5">
                  {t("profile.security_screen.tips.strong_password.body")}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4 pt-6 border-t border-gray-200">
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-blue-50">
                <Info size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base">
                  {t("profile.security_screen.tips.enable_2fa.title")}
                </Text>
                <Text className="text-gray-500 text-sm mt-1 leading-5">
                  {t("profile.security_screen.tips.enable_2fa.body")}
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
