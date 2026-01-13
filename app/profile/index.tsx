import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { uploadAvatar } from "@/services/supabase/storage";
import { useAuthStore } from "@/stores/authStore";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BarChart3,
  Camera,
  HelpCircle,
  LogOut,
  Settings,
  Shield,
  Trash2,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateProfile } = useAuthStore();

  // Local State
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [isEditingName, setIsEditingName] = useState(false);

  // Alert Modal
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            "Success",
            "Avatar updated successfully!",
            undefined,
            "success"
          );
        } else {
          showAlert("Error", "Failed to upload avatar.", undefined, "error");
        }
      } catch {
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
      showAlert("Error", "Failed to update name.", undefined, "error");
    }
  };

  const handleLogout = () => {
    showAlert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/(auth)/login" as never);
          },
        },
      ],
      "warning"
    );
  };

  const handleDeleteAccount = () => {
    showAlert(
      "Delete Account",
      "This feature is coming soon. Your data is safe.",
      undefined,
      "info"
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-4 flex-row items-center bg-white border-b border-gray-100">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="mr-4 p-2 -ml-2"
        >
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">My Profile</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <View className="bg-white mx-4 mt-6 rounded-2xl p-6 shadow-sm">
          <View className="items-center">
            {/* Avatar */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAvatarUpload}
              className="relative"
            >
              <View className="w-24 h-24 rounded-full bg-blue-100 overflow-hidden border-4 border-white shadow-lg">
                {user?.user_metadata?.avatar_url ? (
                  <Image
                    source={{ uri: user.user_metadata.avatar_url }}
                    className="w-full h-full"
                    transition={200}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Text className="text-3xl font-bold text-blue-500">
                      {user?.email?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full border-2 border-white shadow-md">
                {isAvatarUploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Camera size={14} color="white" />
                )}
              </View>
            </TouchableOpacity>

            {/* Name */}
            <View className="mt-4">
              {isEditingName ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-gray-900 min-w-[220px] text-center"
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
                    {user?.user_metadata?.full_name || "Set Name"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Email */}
            <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
          </View>
        </View>

        {/* Main Settings Cards */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Settings
          </Text>

          {/* Preferences Card */}
          <ProfileSettingCard
            title="Preferences"
            subtitle="Language, country, and more"
            icon={<Settings size={20} color="#3b82f6" />}
            iconBgColor="bg-blue-50"
            onPress={() => router.push("/profile/preferences")}
          />

          {/* Account Card */}
          <ProfileSettingCard
            title="Account"
            subtitle="Subscription and billing"
            icon={<User size={20} color="#f59e0b" />}
            iconBgColor="bg-amber-50"
            onPress={() => router.push("/profile/account")}
          />

          {/* Security Card */}
          <ProfileSettingCard
            title="Security"
            subtitle="Password and authentication"
            icon={<Shield size={20} color="#6366f1" />}
            iconBgColor="bg-indigo-50"
            onPress={() => router.push("/profile/security")}
          />

          {/* Progress Card */}
          <ProfileSettingCard
            title="Progress"
            subtitle="Track your learning journey"
            icon={<BarChart3 size={20} color="#22c55e" />}
            iconBgColor="bg-green-50"
            onPress={() => router.push("/profile/progress")}
          />

          {/* Support Card */}
          <ProfileSettingCard
            title="Support"
            subtitle="Help, policies, and feedback"
            icon={<HelpCircle size={20} color="#64748b" />}
            iconBgColor="bg-slate-100"
            onPress={() => router.push("/profile/support")}
          />
        </View>

        {/* Actions Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Actions
          </Text>

          {/* Log Out Card */}
          <ProfileSettingCard
            title="Log Out"
            icon={<LogOut size={20} color="#ef4444" />}
            iconBgColor="bg-red-50"
            textColor="text-red-500"
            showArrow={false}
            onPress={handleLogout}
          />
        </View>

        {/* Danger Zone Section */}
        <View className="mx-4 mt-6 mb-4">
          <Text className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 ml-1">
            Danger Zone
          </Text>

          {/* Delete Account Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm border border-red-100"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-red-50 items-center justify-center">
                <Trash2 size={20} color="#ef4444" />
              </View>
              <View>
                <Text className="text-base font-semibold text-red-500">
                  Delete Account
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  Permanently remove your account
                </Text>
              </View>
            </View>
          </TouchableOpacity>
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
