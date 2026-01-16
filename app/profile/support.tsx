import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { getRainbowColorScheme } from "@/utils/rainbowColors";
import { useRouter } from "expo-router";
import { FileText, Mail, MessageCircle, Scale } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SupportScreen() {
  const router = useRouter();
  const { alertState, showAlert, hideAlert } = useAlertModal();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Support" />

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
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Legal
          </Text>

          {/* Privacy Policy Card */}
          <ProfileSettingCard
            title="Privacy Policy"
            icon={<FileText size={20} color={getRainbowColorScheme(0).iconColor} />}
            colorScheme={getRainbowColorScheme(0)}
            onPress={() => router.push("/profile/privacy")}
          />

          {/* Terms of Service Card */}
          <ProfileSettingCard
            title="Terms of Service"
            icon={<Scale size={20} color={getRainbowColorScheme(1).iconColor} />}
            colorScheme={getRainbowColorScheme(1)}
            onPress={() => router.push("/profile/terms")}
          />
        </View>

        {/* Contact Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Contact Us
          </Text>

          {/* Email Support Card */}
          <ProfileSettingCard
            title="Email Support"
            subtitle="support@fluentai.com"
            icon={<Mail size={20} color={getRainbowColorScheme(2).iconColor} />}
            colorScheme={getRainbowColorScheme(2)}
            onPress={() =>
              showAlert(
                "Contact Us",
                "Email us at support@fluentai.com for any questions or feedback.",
                undefined,
                "info"
              )
            }
          />

          {/* Feedback Card */}
          <ProfileSettingCard
            title="Send Feedback"
            subtitle="Help us improve"
            icon={<MessageCircle size={20} color={getRainbowColorScheme(3).iconColor} />}
            colorScheme={getRainbowColorScheme(3)}
            onPress={() =>
              showAlert(
                "Coming Soon",
                "In-app feedback feature will be available soon.",
                undefined,
                "info"
              )
            }
          />
        </View>

        {/* App Info */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            App Info
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-500">Version</Text>
              <Text className="text-gray-900 font-medium">1.0.0</Text>
            </View>
            <View className="flex-row justify-between py-2 border-t border-gray-100">
              <Text className="text-gray-500">Build</Text>
              <Text className="text-gray-900 font-medium">Prototype</Text>
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
