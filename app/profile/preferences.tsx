import CountryPicker from "@/components/profile/CountryPicker";
import LanguagePicker from "@/components/profile/LanguagePicker";
import ProfileSettingCard from "@/components/profile/ProfileSettingCard";
import { setAppLanguage } from "@/services/i18n";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Languages,
    MapPin,
    Settings,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PreferencesScreen() {
    const router = useRouter();
    const { user, updateProfile } = useAuthStore();

    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    const handleUpdateCountry = async (country: string) => {
        try {
            await updateProfile({ country });
            setShowCountryPicker(false);
        } catch {
            // Error handling - silent for now
        }
    };

    const handleUpdateLanguage = async (lang: string) => {
        try {
            await setAppLanguage(lang);
            await updateProfile({ app_language: lang });
            setShowLanguagePicker(false);
        } catch {
            // Error handling - silent for now
        }
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
                <Text className="text-xl font-bold text-gray-900">Preferences</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Main Card Display */}
                <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                            <Settings size={32} color="#3b82f6" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Preferences</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Customize your app experience
                        </Text>
                    </View>
                </View>

                {/* Settings Items */}
                <View className="mx-4 mt-6">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
                        Settings
                    </Text>

                    {/* Country Card */}
                    <ProfileSettingCard
                        title="Country"
                        subtitle={user?.user_metadata?.country || "Not set"}
                        icon={<MapPin size={20} color="#10b981" />}
                        iconBgColor="bg-emerald-50"
                        onPress={() => setShowCountryPicker(true)}
                    />

                    {/* Language Card */}
                    <ProfileSettingCard
                        title="App Language"
                        subtitle={
                            user?.user_metadata?.app_language === "hi"
                                ? "Hindi"
                                : user?.user_metadata?.app_language === "es"
                                    ? "Spanish"
                                    : "English"
                        }
                        icon={<Languages size={20} color="#8b5cf6" />}
                        iconBgColor="bg-violet-50"
                        onPress={() => setShowLanguagePicker(true)}
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

            <LanguagePicker
                visible={showLanguagePicker}
                onClose={() => setShowLanguagePicker(false)}
                onSelect={handleUpdateLanguage}
                selectedLang={user?.user_metadata?.app_language}
            />
        </SafeAreaView>
    );
}
