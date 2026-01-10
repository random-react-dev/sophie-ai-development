import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import CountryPicker from "@/components/profile/CountryPicker";
import LanguagePicker from "@/components/profile/LanguagePicker";
import { setAppLanguage } from "@/services/i18n";
import { uploadAvatar } from "@/services/supabase/storage";
import { useAuthStore } from "@/stores/authStore";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Crown,
  FileText,
  Languages,
  Lock,
  LogOut,
  MapPin,
  Receipt,
  Scale,
  Shield,
  Sparkles,
  Trash2,
  Wallet,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [isEditingName, setIsEditingName] = useState(false);

  // Modals
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
    setIsLoading(true);
    try {
      await updateProfile({ full_name: name });
      setIsEditingName(false);
    } catch {
      showAlert("Error", "Failed to update name.", undefined, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCountry = async (country: string) => {
    setIsLoading(true);
    try {
      await updateProfile({ country });
      setShowCountryPicker(false);
    } catch {
      showAlert("Error", "Failed to update country.", undefined, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLanguage = async (lang: string) => {
    setIsLoading(true);
    try {
      await setAppLanguage(lang);
      await updateProfile({ app_language: lang });
      setShowLanguagePicker(false);
    } catch {
      showAlert("Error", "Failed to update language.", undefined, "error");
    } finally {
      setIsLoading(false);
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

        {/* Preferences Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Preferences
          </Text>

          {/* Country Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowCountryPicker(true)}
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-emerald-50 items-center justify-center">
                <MapPin size={20} color="#10b981" />
              </View>
              <View>
                <Text className="text-xs text-gray-400 font-medium">
                  Country
                </Text>
                <Text className="text-base font-semibold text-gray-900">
                  {user?.user_metadata?.country || "Not set"}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Language Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowLanguagePicker(true)}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-violet-50 items-center justify-center">
                <Languages size={20} color="#8b5cf6" />
              </View>
              <View>
                <Text className="text-xs text-gray-400 font-medium">
                  App Language
                </Text>
                <Text className="text-base font-semibold text-gray-900">
                  {user?.user_metadata?.app_language === "hi"
                    ? "Hindi"
                    : user?.user_metadata?.app_language === "es"
                    ? "Spanish"
                    : "English"}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Account
          </Text>

          {/* Status Card */}
          <View className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm">
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center">
                <Sparkles size={20} color="#f59e0b" />
              </View>
              <Text className="text-base font-semibold text-gray-900">
                Status
              </Text>
            </View>
            <View className="bg-yellow-100 px-3 py-1 rounded-full">
              <Text className="text-yellow-600 text-xs font-bold uppercase">
                Free Trial
              </Text>
            </View>
          </View>

          {/* Upgrade to Pro Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center">
                <Crown size={20} color="#3b82f6" />
              </View>
              <Text className="text-base font-semibold text-blue-500">
                Upgrade to Pro
              </Text>
            </View>
            <ChevronRight size={20} color="#93c5fd" />
          </TouchableOpacity>

          {/* Payment Methods Card */}
          <TouchableOpacity
            activeOpacity={0.5}
            disabled
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between opacity-60 shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center">
                <Wallet size={20} color="#9ca3af" />
              </View>
              <Text className="text-base font-semibold text-gray-500">
                Payment Methods
              </Text>
            </View>
            <Text className="text-xs text-gray-400 font-medium">
              Coming Soon
            </Text>
          </TouchableOpacity>

          {/* Billing History Card */}
          <TouchableOpacity
            activeOpacity={0.5}
            disabled
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between opacity-60 shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center">
                <Receipt size={20} color="#9ca3af" />
              </View>
              <Text className="text-base font-semibold text-gray-500">
                Billing History
              </Text>
            </View>
            <Text className="text-xs text-gray-400 font-medium">
              Coming Soon
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Security
          </Text>

          {/* Change Password Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPasswordModal(true)}
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-indigo-50 items-center justify-center">
                <Lock size={20} color="#6366f1" />
              </View>
              <Text className="text-base font-semibold text-gray-900">
                Change Password
              </Text>
            </View>
            <ChevronRight size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Two-Factor Auth Card */}
          <View className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between opacity-60 shadow-sm">
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center">
                <Shield size={20} color="#9ca3af" />
              </View>
              <Text className="text-base font-semibold text-gray-500">
                Two-Factor Auth
              </Text>
            </View>
            <Text className="text-xs text-gray-400 font-medium">
              Not Enabled
            </Text>
          </View>

          {/* Log Out Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleLogout}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-red-50 items-center justify-center">
                <LogOut size={20} color="#ef4444" />
              </View>
              <Text className="text-base font-semibold text-red-500">
                Log Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View className="mx-4 mt-6 mb-4">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Support
          </Text>

          {/* Privacy Policy Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              showAlert(
                "Coming Soon",
                "Privacy Policy will be available soon.",
                undefined,
                "info"
              )
            }
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-slate-100 items-center justify-center">
                <FileText size={20} color="#64748b" />
              </View>
              <Text className="text-base font-semibold text-gray-900">
                Privacy Policy
              </Text>
            </View>
            <ChevronRight size={20} color="#d1d5db" />
          </TouchableOpacity>

          {/* Terms of Service Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              showAlert(
                "Coming Soon",
                "Terms of Service will be available soon.",
                undefined,
                "info"
              )
            }
            className="bg-white rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <View className="w-11 h-11 rounded-xl bg-slate-100 items-center justify-center">
                <Scale size={20} color="#64748b" />
              </View>
              <Text className="text-base font-semibold text-gray-900">
                Terms of Service
              </Text>
            </View>
            <ChevronRight size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View className="mx-4 mb-4">
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
            <ChevronRight size={20} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <CountryPicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={handleUpdateCountry}
        selectedCountry={user?.user_metadata?.country}
      />

      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={handleUpdateLanguage}
        selectedLang={user?.user_metadata?.app_language}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

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
