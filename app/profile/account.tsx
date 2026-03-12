import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
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
