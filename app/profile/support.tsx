import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import {
  disabledColorScheme,
  getRainbowColorScheme,
} from "@/utils/rainbowColors";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FileText,
  Mail,
  MessageCircle,
  Scale,
  Trash2,
} from "lucide-react-native";
import React from "react";
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SupportScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const { deleteAccount } = useAuthStore();

  const handleDeleteAccount = () => {
    showAlert(
      t("profile.support_screen.delete_account_alert_title"),
      t("profile.support_screen.delete_account_alert_body"),
      [
        {
          text: t("common.cancel") || "Cancel",
          style: "cancel",
          onPress: hideAlert,
        },
        {
          text: t("common.delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            hideAlert();
            try {
              await deleteAccount();
              // Navigation to login is handled by auth state change listener or manual redirect
              router.replace("/(auth)/login");
            } catch (error: any) {
              console.error("Delete account error:", error);
              // Wait for previous modal to close
              setTimeout(() => {
                showAlert(
                  t("common.error") || "Error",
                  error.message || "Failed to delete account",
                  undefined,
                  "error",
                );
              }, 500);
            }
          },
        },
      ],
      "warning",
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.support_screen.title")} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
          <View className="bg-surface rounded-2xl p-6 shadow-sm items-center">
            <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <HelpCircle size={32} color="#64748b" />
            </View>
            <Text className="text-xl font-bold text-gray-900">Support</Text>
            <Text className="text-sm text-gray-500 mt-1">
              Get help and information
            </Text>
          </View>
        </View> */}

        {/* Legal Section */}
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.support_screen.legal")}
          </Text>

          {/* Privacy Policy Card */}
          <ProfileSettingCard
            title={t("profile.support_screen.privacy_policy")}
            icon={
              <FileText size={20} color={getRainbowColorScheme(0).iconColor} />
            }
            colorScheme={getRainbowColorScheme(0)}
            onPress={() => router.push("/profile/privacy")}
          />

          {/* Terms of Service Card */}
          <ProfileSettingCard
            title={t("profile.support_screen.terms_of_service")}
            icon={
              <Scale size={20} color={getRainbowColorScheme(1).iconColor} />
            }
            colorScheme={getRainbowColorScheme(1)}
            onPress={() => router.push("/profile/terms")}
          />
        </View>

        {/* Contact Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.support_screen.contact_us")}
          </Text>

          {/* Email Support Card */}
          <ProfileSettingCard
            title={t("profile.support_screen.email_support")}
            subtitle="support@speakwithsophie.ai"
            icon={<Mail size={20} color={getRainbowColorScheme(2).iconColor} />}
            colorScheme={getRainbowColorScheme(2)}
            onPress={() =>
              showAlert(
                t("profile.support_screen.contact_alert_title"),
                t("profile.support_screen.contact_alert_body"),
                undefined,
                "info",
              )
            }
          />

          {/* Feedback Card */}
          <ProfileSettingCard
            title={t("profile.support_screen.send_feedback")}
            subtitle={t("profile.support_screen.help_improve")}
            icon={
              <MessageCircle size={20} color={disabledColorScheme.iconColor} />
            }
            colorScheme={disabledColorScheme}
            onPress={() =>
              showAlert(
                t("profile.support_screen.feedback_alert_title"),
                t("profile.support_screen.feedback_alert_body"),
                undefined,
                "info",
              )
            }
          />

          {/* WhatsApp Support Card */}
          <ProfileSettingCard
            title={t("profile.support_screen.whatsapp_support")}
            subtitle={t("profile.support_screen.whatsapp_subtitle")}
            icon={<FontAwesome name="whatsapp" size={20} color="#25D366" />}
            colorScheme={{
              iconColor: "#25D366",
              iconBgColor: "bg-green-50",
              borderColor: "border-green-200",
            }}
            onPress={() => {
              const phoneNumber = "971505814567";
              const message = encodeURIComponent(
                t("profile.support_screen.whatsapp_message"),
              );
              const url = `https://wa.me/${phoneNumber}?text=${message}`;
              Linking.openURL(url);
            }}
          />
        </View>

        {/* Danger Zone Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.support_screen.danger_zone")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-red-200"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-red-50 items-center justify-center">
                <Trash2 size={20} color="#ef4444" />
              </View>
              <View>
                <Text className="text-base font-semibold text-red-500">
                  {t("profile.support_screen.delete_account")}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {t("profile.support_screen.delete_account_subtitle")}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            {t("profile.support_screen.app_info")}
          </Text>

          <View className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-gray-500 flex-1">
                {t("profile.support_screen.version")}
              </Text>
              <Text className="text-gray-900 font-bold text-right">1.0.0</Text>
            </View>
            <View className="flex-row items-center justify-between py-2 border-t border-gray-200">
              <Text className="text-gray-500 flex-1">
                {t("profile.support_screen.build")}
              </Text>
              <Text className="text-gray-900 font-bold text-right">
                {t("profile.support_screen.prototype")}
              </Text>
            </View>
          </View>
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
