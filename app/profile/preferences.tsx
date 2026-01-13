import CountryPicker from "@/components/profile/CountryPicker";
import LanguagePicker from "@/components/profile/LanguagePicker";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import { getLanguageByCode } from "@/constants/languages";
import { setAppLanguage } from "@/services/i18n";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { Globe, Languages, Mail, MapPin, User } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PreferencesScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();

  // Modal states
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPreferredPicker, setShowPreferredPicker] = useState(false);
  const [showNativePicker, setShowNativePicker] = useState(false);

  const handleUpdateCountry = async (country: string) => {
    try {
      await updateProfile({ country });
      setShowCountryPicker(false);
    } catch {
      // Silent error handling for prototype
    }
  };

  const handleUpdatePreferredLanguage = async (langCode: string) => {
    try {
      await setAppLanguage(langCode);
      await updateProfile({ app_language: langCode });
      setShowPreferredPicker(false);
    } catch {
      // Silent error handling for prototype
    }
  };

  const handleUpdateNativeLanguage = async (langCode: string) => {
    try {
      await updateProfile({ native_language: langCode });
      setShowNativePicker(false);
    } catch {
      // Silent error handling for prototype
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Preferences" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                            <User size={32} color="#3b82f6" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Preferences</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Customize your preferences
                        </Text>
                    </View>
                </View> */}

        {/* Identity Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Account Info
          </Text>

          {/* Name Card - Read Only */}
          <ProfileSettingCard
            title="Name"
            subtitle={user?.user_metadata?.full_name || "Not set"}
            icon={<User size={20} color="#3b82f6" />}
            iconBgColor="bg-blue-50"
            showArrow={false}
          />

          {/* Email Card - Read Only */}
          <ProfileSettingCard
            title="Email"
            subtitle={user?.email || "Not set"}
            icon={<Mail size={20} color="#6366f1" />}
            iconBgColor="bg-indigo-50"
            showArrow={false}
          />
        </View>

        {/* Localization Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Localization
          </Text>

          {/* Country Card */}
          <ProfileSettingCard
            title="Country"
            subtitle={user?.user_metadata?.country || "Not set"}
            icon={<MapPin size={20} color="#10b981" />}
            iconBgColor="bg-emerald-50"
            onPress={() => setShowCountryPicker(true)}
          />

          {/* Native Language Card */}
          <ProfileSettingCard
            title="Native Language"
            subtitle={
              getLanguageByCode(user?.user_metadata?.native_language)?.name ||
              "Select Language"
            }
            icon={<Globe size={20} color="#f59e0b" />}
            iconBgColor="bg-amber-50"
            onPress={() => setShowNativePicker(true)}
          />

          {/* Preferred Language Card */}
          <ProfileSettingCard
            title="Preferred Language"
            subtitle={
              user?.user_metadata?.app_language === "hi"
                ? "Hindi"
                : user?.user_metadata?.app_language === "es"
                ? "Spanish"
                : "English"
            }
            icon={<Languages size={20} color="#8b5cf6" />}
            iconBgColor="bg-violet-50"
            onPress={() => setShowPreferredPicker(true)}
          />
        </View>
      </ScrollView>

      {/* Modals */}
      <CountryPicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={handleUpdateCountry}
        selectedCountry={user?.user_metadata?.country}
      />

      {/* Preferred Language Picker (Original) */}
      <LanguagePicker
        visible={showPreferredPicker}
        onClose={() => setShowPreferredPicker(false)}
        onSelect={handleUpdatePreferredLanguage}
        selectedLang={user?.user_metadata?.app_language}
      />

      {/* Native Language Picker (Modal with Search) */}
      <LanguagePickerModal
        visible={showNativePicker}
        onClose={() => setShowNativePicker(false)}
        onSelect={(lang) => handleUpdateNativeLanguage(lang.code)}
        selectedCode={user?.user_metadata?.native_language}
        title="Select Native Language"
      />
    </SafeAreaView>
  );
}
