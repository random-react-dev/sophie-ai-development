import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.terms_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Content Section */}
        <View className="mx-4 mt-6 bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            {t("profile.terms_screen.last_updated")}
          </Text>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section1_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section1_body")}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section2_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section2_body")}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section3_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section3_body")}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section4_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section4_body")}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section5_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section5_body")}
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section6_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section6_body")}
            </Text>
          </View>

          <View>
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("profile.terms_screen.section7_title")}
            </Text>
            <Text className="text-gray-600 leading-6">
              {t("profile.terms_screen.section7_body")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
