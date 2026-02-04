import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { useTranslation } from "@/hooks/useTranslation";
import { uploadAvatar } from "@/services/supabase/storage";
import { useAuthStore } from "@/stores/authStore";
import { getRainbowColorScheme } from "@/utils/rainbowColors";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  BarChart3,
  Camera,
  HelpCircle,
  LogOut,
  Settings,
  Share2,
  Shield,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut, updateProfile } = useAuthStore();

  // Local State
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [isEditingName, setIsEditingName] = useState(false);

  // Alert Modal
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && user) {
      setIsAvatarUploading(true);
      try {
        const publicUrl = await uploadAvatar(user.id, result.assets[0].uri);

        if (publicUrl) {
          await updateProfile({ avatar_url: publicUrl });

          showAlert(
            t("common.success"),
            t("profile.menu.avatarSuccess"),
            undefined,
            "success",
          );
        } else {
          console.error("[Avatar] Upload returned null URL");
          showAlert(
            t("common.error"),
            t("profile.menu.avatarError"),
            undefined,
            "error",
          );
        }
      } catch (err) {
        console.error("[Avatar] Error in handleAvatarUpload:", err);
        showAlert("Error", "An unexpected error occurred.", undefined, "error");
      } finally {
        setIsAvatarUploading(false);
      }
    }
  };

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile({ full_name: name });
      setIsEditingName(false);
    } catch {
      showAlert(
        t("common.error"),
        t("profile.menu.nameError"),
        undefined,
        "error",
      );
    }
  };

  const handleLogout = () => {
    showAlert(
      t("profile.menu.logoutConfirm.title"),
      t("profile.menu.logoutConfirm.message"),
      [
        { text: t("profile.menu.logoutConfirm.cancel"), style: "cancel" },
        {
          text: t("profile.menu.logoutConfirm.confirm"),
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/login" as never);
          },
        },
      ],
      "warning",
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title={t("profile.title")} />

      <View className="flex-1 justify-between">
        {/* Profile Card */}
        <View className="bg-surface mx-4 mt-2 rounded-2xl p-4 shadow-sm">
          <View className="items-center">
            {/* Avatar */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAvatarUpload}
              className="relative"
            >
              <View className="w-24 h-24 rounded-full bg-blue-50 overflow-hidden border-4 border-white shadow-lg">
                {(() => {
                  const avatarUrl = user?.user_metadata?.avatar_url;

                  if (avatarUrl) {
                    return (
                      <Image
                        key={avatarUrl} // Force re-mount on URL change
                        source={{ uri: avatarUrl }}
                        style={{ width: "100%", height: "100%" }}
                        className="w-full h-full"
                        contentFit="cover"
                        cachePolicy="none" // Disable caching to force fresh load
                        transition={200}
                        onLoad={() => {}}
                        onError={(e) =>
                          console.warn(
                            "[Avatar] Load error:",
                            e.error,
                            "URL:",
                            avatarUrl,
                          )
                        }
                      />
                    );
                  }

                  return (
                    <View className="w-full h-full items-center justify-center">
                      <Text className="text-2xl font-bold text-blue-500">
                        {user?.email?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <View className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full border-2 border-white shadow-md">
                {isAvatarUploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Camera size={12} color="white" />
                )}
              </View>
            </TouchableOpacity>

            {/* Name */}
            <View className="mt-4">
              {isEditingName ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-gray-900 min-w-[100px] text-center"
                  autoFocus
                  onBlur={handleUpdateName}
                  onSubmitEditing={handleUpdateName}
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsEditingName(true)}
                >
                  <Text className="text-xl font-bold text-gray-900 text-center">
                    {user?.user_metadata?.full_name ||
                      t("profile.menu.setName")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Email */}
            <Text
              className="text-gray-500 text-sm mt-1 text-center w-full"
              numberOfLines={2}
              selectable
            >
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Main Settings Cards */}
        <View className="mx-4 mt-3">
          {/* Preferences Card */}
          <ProfileSettingCard
            title={t("profile.menu.preferences.title")}
            subtitle={t("profile.menu.preferences.subtitle")}
            icon={
              <Settings size={20} color={getRainbowColorScheme(0).iconColor} />
            }
            colorScheme={getRainbowColorScheme(0)}
            onPress={() => router.push("/profile/preferences")}
          />

          {/* Account Card */}
          <ProfileSettingCard
            title={t("profile.menu.account.title")}
            subtitle={t("profile.menu.account.subtitle")}
            icon={<User size={20} color={getRainbowColorScheme(1).iconColor} />}
            colorScheme={getRainbowColorScheme(1)}
            onPress={() => router.push("/profile/account")}
          />

          {/* Security Card */}
          <ProfileSettingCard
            title={t("profile.menu.security.title")}
            subtitle={t("profile.menu.security.subtitle")}
            icon={
              <Shield size={20} color={getRainbowColorScheme(2).iconColor} />
            }
            colorScheme={getRainbowColorScheme(2)}
            onPress={() => router.push("/profile/security")}
          />

          {/* Progress Card */}
          <ProfileSettingCard
            title={t("profile.menu.progress.title")}
            subtitle={t("profile.menu.progress.subtitle")}
            icon={
              <BarChart3 size={20} color={getRainbowColorScheme(3).iconColor} />
            }
            colorScheme={getRainbowColorScheme(3)}
            onPress={() => router.push("/profile/progress")}
          />

          {/* Support Card */}
          <ProfileSettingCard
            title={t("profile.menu.support.title")}
            subtitle={t("profile.menu.support.subtitle")}
            icon={
              <HelpCircle
                size={20}
                color={getRainbowColorScheme(4).iconColor}
              />
            }
            colorScheme={getRainbowColorScheme(4)}
            onPress={() => router.push("/profile/support")}
          />

          {/* Social Media Card */}
          <ProfileSettingCard
            title={t("profile.menu.social.title")}
            subtitle={t("profile.menu.social.subtitle")}
            icon={
              <Share2
                size={20}
                color="#9333EA" // Purple-600
              />
            }
            colorScheme={{
              iconColor: "#9333EA",
              iconBgColor: "bg-purple-50",
              borderColor: "border-purple-300", // Stronger purple border as requested
            }}
            onPress={() => router.push("/profile/social")}
          />
        </View>

        {/* Actions Section */}
        <View className="mb-4">
          <View className="mx-4">
            {/* Log Out Card */}
            <ProfileSettingCard
              title={t("profile.menu.logout")}
              icon={<LogOut size={20} color="#ef4444" />}
              iconBgColor="bg-red-50"
              textColor="text-red-500"
              showArrow={false}
              onPress={handleLogout}
            />
          </View>
        </View>
      </View>

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
