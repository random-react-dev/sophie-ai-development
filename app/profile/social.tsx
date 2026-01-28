import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SocialScreen() {
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleOpenLink = async (url: string, platformName: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert(
          "Error",
          `Could not open ${platformName}. Please try again later.`,
          undefined,
          "error",
        );
      }
    } catch (error) {
      showAlert(
        "Error",
        `An error occurred while trying to open ${platformName}.`,
        undefined,
        "error",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Social Media" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Connect With Us
          </Text>

          {/* Instagram */}
          <ProfileSettingCard
            title="Instagram"
            subtitle="Follow us on Instagram"
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
            title="Facebook"
            subtitle="Join our community"
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
            title="X (Twitter)"
            subtitle="Follow us on X"
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
            title="LinkedIn"
            subtitle="Connect professionally"
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
            title="YouTube"
            subtitle="Subscribe to our channel"
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
            title="TikTok"
            subtitle="Watch our latest videos"
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
            title="Reddit"
            subtitle="Join the discussion"
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
