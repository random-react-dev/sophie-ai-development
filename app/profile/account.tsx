import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import {
  disabledColorScheme,
  getRainbowColorScheme,
} from "@/utils/rainbowColors";
import { useRouter } from "expo-router";
import { Crown, Receipt, Sparkles, Wallet } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.account_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center mb-4">
                            <User size={32} color="#f59e0b" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Account</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Manage your account settings
                        </Text>
                    </View>
                </View> */}

        {/* Account Items */}
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.account_screen.subscription")}
          </Text>

          {/* Status Card */}
          <ProfileSettingCard
            title={t("profile.account_screen.status")}
            icon={
              <Sparkles size={20} color={getRainbowColorScheme(0).iconColor} />
            }
            colorScheme={getRainbowColorScheme(0)}
            showArrow={false}
            rightElement={
              <View className="bg-yellow-100 px-3 py-1 rounded-full">
                <Text className="text-yellow-600 text-xs font-bold uppercase">
                  {t("profile.account_screen.freeTrial")}
                </Text>
              </View>
            }
          />

          {/* Upgrade to Pro Card */}
          <ProfileSettingCard
            title={t("profile.account_screen.upgradeToPro")}
            icon={
              <Crown size={20} color={getRainbowColorScheme(1).iconColor} />
            }
            colorScheme={getRainbowColorScheme(1)}
            textColor="text-blue-500"
            onPress={() => {
              router.push("/profile/subscription");
            }}
          />
        </View>

        {/* Payment Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.account_screen.payment")}
          </Text>

          {/* Payment Methods Card */}
          <ProfileSettingCard
            title={t("profile.account_screen.paymentMethods")}
            subtitle={t("profile.account_screen.comingSoon")}
            icon={<Wallet size={20} color={disabledColorScheme.iconColor} />}
            colorScheme={disabledColorScheme}
            showArrow={false}
            rightElement={
              <Text className="text-xs text-gray-400 font-medium">
                {t("profile.account_screen.comingSoon")}
              </Text>
            }
          />

          {/* Billing History Card */}
          <ProfileSettingCard
            title={t("profile.account_screen.billingHistory")}
            icon={<Receipt size={20} color={disabledColorScheme.iconColor} />}
            colorScheme={disabledColorScheme}
            showArrow={false}
            rightElement={
              <Text className="text-xs text-gray-400 font-medium">
                {t("profile.account_screen.comingSoon")}
              </Text>
            }
          />
        </View>

        {/* Account Info */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.account_screen.accountInfo")}
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500">
                {t("profile.account_screen.email")}
              </Text>
              <Text className="text-gray-900 font-medium">{user?.email}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-t border-gray-100">
              <Text className="text-gray-500 w-full flex-1">
                {t("profile.account_screen.memberSince")}
              </Text>
              <Text className="text-gray-900 font-medium">
                {user?.created_at
                  ? (() => {
                      const date = new Date(user.created_at);
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()
                  : t("profile.account_screen.na")}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
