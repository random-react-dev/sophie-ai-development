import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SocialScreen() {
  const { t } = useTranslation();
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleOpenLink = async (url: string, platformName: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert(
          t("profile.social_screen.error"),
          t("profile.social_screen.open_error", { platform: platformName }),
          undefined,
          "error",
        );
      }
    } catch {
      showAlert(
        t("profile.social_screen.error"),
        t("profile.social_screen.general_error", { platform: platformName }),
        undefined,
        "error",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.social_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.social_screen.section_title")}
          </Text>

          {/* Instagram */}
          <ProfileSettingCard
            title={t("profile.social_screen.instagram")}
            subtitle={t("profile.social_screen.instagram_subtitle")}
            icon={<FontAwesome6 name="instagram" size={24} color="#E1306C" />}
            colorScheme={{
              iconColor: "#E1306C",
              iconBgColor: "bg-pink-50",
              borderColor: "border-pink-200",
            }}
            onPress={() =>
              handleOpenLink("https://www.instagram.com", "Instagram")
            }
          />

          {/* Facebook */}
          <ProfileSettingCard
            title={t("profile.social_screen.facebook")}
            subtitle={t("profile.social_screen.facebook_subtitle")}
            icon={<FontAwesome6 name="facebook" size={24} color="#1877F2" />}
            colorScheme={{
              iconColor: "#1877F2",
              iconBgColor: "bg-indigo-50",
              borderColor: "border-indigo-200",
            }}
            onPress={() => handleOpenLink("https://facebook.com", "Facebook")}
          />

          {/* X (Twitter) */}
          <ProfileSettingCard
            title={t("profile.social_screen.twitter")}
            subtitle={t("profile.social_screen.twitter_subtitle")}
            icon={<FontAwesome6 name="x-twitter" size={22} color="#000000" />}
            colorScheme={{
              iconColor: "#000000",
              iconBgColor: "bg-gray-100",
              borderColor: "border-gray-200",
            }}
            onPress={() => handleOpenLink("https://twitter.com", "Twitter")}
          />

          {/* LinkedIn */}
          <ProfileSettingCard
            title={t("profile.social_screen.linkedin")}
            subtitle={t("profile.social_screen.linkedin_subtitle")}
            icon={<FontAwesome6 name="linkedin" size={24} color="#0077B5" />}
            colorScheme={{
              iconColor: "#0077B5",
              iconBgColor: "bg-blue-50",
              borderColor: "border-blue-200",
            }}
            onPress={() => handleOpenLink("https://linkedin.com", "LinkedIn")}
          />

          {/* YouTube */}
          <ProfileSettingCard
            title={t("profile.social_screen.youtube")}
            subtitle={t("profile.social_screen.youtube_subtitle")}
            icon={<FontAwesome6 name="youtube" size={22} color="#FF0000" />}
            colorScheme={{
              iconColor: "#FF0000",
              iconBgColor: "bg-red-50",
              borderColor: "border-red-200",
            }}
            onPress={() => handleOpenLink("https://youtube.com", "YouTube")}
          />

          {/* TikTok */}
          <ProfileSettingCard
            title={t("profile.social_screen.tiktok")}
            subtitle={t("profile.social_screen.tiktok_subtitle")}
            icon={<FontAwesome6 name="tiktok" size={22} color="#000000" />}
            colorScheme={{
              iconColor: "#000000",
              iconBgColor: "bg-gray-100",
              borderColor: "border-gray-200",
            }}
            onPress={() => handleOpenLink("https://tiktok.com", "TikTok")}
          />

          {/* Reddit */}
          <ProfileSettingCard
            title={t("profile.social_screen.reddit")}
            subtitle={t("profile.social_screen.reddit_subtitle")}
            icon={
              <FontAwesome6 name="reddit-alien" size={24} color="#FF4500" />
            }
            colorScheme={{
              iconColor: "#FF4500",
              iconBgColor: "bg-orange-50",
              borderColor: "border-orange-200",
            }}
            onPress={() => handleOpenLink("https://www.reddit.com/", "Reddit")}
          />
        </View>
      </ScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </SafeAreaView>
  );
}
