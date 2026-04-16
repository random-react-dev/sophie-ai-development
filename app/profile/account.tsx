import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import {
  useEntitlementExpiresAt,
  useIsPro,
} from "@/stores/entitlementStore";
import { useRouter } from "expo-router";
import { Crown } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = useIsPro();
  const expiresAt = useEntitlementExpiresAt();

  const formatDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}/${d.getFullYear()}`;

  const subscriptionSubtitle =
    isPro && expiresAt
      ? t("profile.account_screen.subscription.activeSubtitle", {
          date: formatDate(expiresAt),
        })
      : t("profile.account_screen.subscription.manageSubtitle");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.account_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Subscription */}
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.account_screen.subscription.section")}
          </Text>
          <ProfileSettingCard
            title={t("profile.account_screen.subscription.title")}
            subtitle={subscriptionSubtitle}
            icon={<Crown size={20} color="#D97706" />}
            iconBgColor="bg-amber-50"
            onPress={() => router.push("/profile/subscription")}
          />
        </View>

        {/* Account Info */}
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.account_screen.accountInfo")}
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500 flex-grow">
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
