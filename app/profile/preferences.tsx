import CountryPicker from "@/components/profile/CountryPicker";
import LanguagePicker from "@/components/profile/LanguagePicker";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import ThemeCard from "@/components/profile/ThemeCard";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import { getLanguageByCode } from "@/constants/languages";
import { useAuthStore } from "@/stores/authStore";
import { useLanguageStore } from "@/stores/languageStore";
import { useThemeStore } from "@/stores/themeStore";
import { getRainbowColorScheme } from "@/utils/rainbowColors";
import { Globe, Languages, Mail, MapPin, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PreferencesScreen() {
  const { user, updateProfile } = useAuthStore();
  const { theme, setTheme, loadTheme } = useThemeStore();
  const { setLanguage } = useLanguageStore();

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

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
      setLanguage(langCode);
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
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Account Info
          </Text>

          {/* Name Card - Read Only */}
          <ProfileSettingCard
            title="Name"
            subtitle={user?.user_metadata?.full_name || "Not set"}
            icon={<User size={20} color={getRainbowColorScheme(0).iconColor} />}
            colorScheme={getRainbowColorScheme(0)}
            showArrow={false}
          />

          {/* Email Card - Read Only */}
          <ProfileSettingCard
            title="Email"
            subtitle={user?.email || "Not set"}
            icon={<Mail size={20} color={getRainbowColorScheme(1).iconColor} />}
            colorScheme={getRainbowColorScheme(1)}
            showArrow={false}
          />
        </View>

        {/* Localization Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Languages
          </Text>

          {/* Country Card */}
          <ProfileSettingCard
            title="Country"
            subtitle={user?.user_metadata?.country || "Not set"}
            icon={<MapPin size={20} color={getRainbowColorScheme(2).iconColor} />}
            colorScheme={getRainbowColorScheme(2)}
            onPress={() => setShowCountryPicker(true)}
          />

          {/* Native Language Card */}
          <ProfileSettingCard
            title="Native Language"
            subtitle={
              getLanguageByCode(user?.user_metadata?.native_language)?.name ||
              "Select Language"
            }
            icon={<Globe size={20} color={getRainbowColorScheme(3).iconColor} />}
            colorScheme={getRainbowColorScheme(3)}
            onPress={() => setShowNativePicker(true)}
          />

          {/* Preferred Language Card */}
          <ProfileSettingCard
            title="App Language"
            subtitle={
              user?.user_metadata?.app_language === "hi"
                ? "Hindi"
                : user?.user_metadata?.app_language === "es"
                  ? "Spanish"
                  : "English"
            }
            icon={<Languages size={20} color={getRainbowColorScheme(4).iconColor} />}
            colorScheme={getRainbowColorScheme(4)}
            onPress={() => setShowPreferredPicker(true)}
          />
        </View>

        {/* Appearance Section */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Appearance
          </Text>

          {/* Theme Selector Card */}
          <View className="bg-surface rounded-2xl p-6 shadow-sm">
            {/* Theme Cards Row */}
            <View className="flex-row justify-center gap-8">
              <ThemeCard
                theme="light"
                isSelected={theme === "light"}
                onSelect={() => setTheme("light")}
              />
              <ThemeCard
                theme="dark"
                isSelected={theme === "dark"}
                onSelect={() => setTheme("dark")}
              />
            </View>

            {/* Divider */}
            <View className="h-px bg-gray-200 mt-6 mb-4" />

            {/* Colour scheme label */}
            <Text className="text-base font-semibold text-gray-900">
              Colour scheme
            </Text>
          </View>
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
