import TwoFactorToggleModal from "@/components/auth/TwoFactorToggleModal";
import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
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
  const [show2FAModal, setShow2FAModal] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const is2FAEnabled = user?.user_metadata?.two_factor_enabled === true;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.security_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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
            icon={
              <Shield
                size={20}
                color={
                  is2FAEnabled
                    ? getRainbowColorScheme(1).iconColor
                    : disabledColorScheme.iconColor
                }
              />
            }
            colorScheme={
              is2FAEnabled ? getRainbowColorScheme(1) : disabledColorScheme
            }
            onPress={() => setShow2FAModal(true)}
            rightElement={
              <Text
                className={`text-xs font-medium ${is2FAEnabled ? "text-green-600" : "text-gray-400"
                  }`}
              >
                {is2FAEnabled
                  ? t("profile.security_screen.two_factor.status_enabled")
                  : t("profile.security_screen.two_factor.status_disabled")}
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
      <TwoFactorToggleModal
        visible={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        currentlyEnabled={is2FAEnabled}
      />
    </SafeAreaView>
  );
}
