import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { useVocabularyStore } from "@/stores/vocabularyStore";
import { isVoiceModeAvailable } from "@/utils/environment";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Globe, Languages, MessageCircle, VenetianMask } from "lucide-react-native";
import React, { useEffect } from "react";
import { Dimensions, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Get screen width for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Base design width (iPhone SE/8)
const BASE_WIDTH = 375;
// Responsive font size calculator
const responsiveFontSize = (size: number) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * Math.min(scale, 1.2); // Cap at 1.2x to prevent too large on tablets
  return Math.max(newSize, size * 0.85); // Min 85% of original to stay readable
};

// Check if voice mode is available (not available in Expo Go)
const voiceAvailable = isVoiceModeAvailable();

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { fetchVocabulary } = useVocabularyStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchVocabulary();
    }
  }, [user]);

  // Find flag for active profile target language
  const activeFlag = activeProfile
    ? SUPPORTED_LANGUAGES.find((l) => l.name === activeProfile.target_language)
        ?.flag
    : null;

  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: "#94a3b8",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#f1f5f9",
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          paddingHorizontal: 8,
        },
        tabBarLabel: ({ children, color }) => (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              color,
              fontFamily: "GoogleSans-Bold",
              fontSize: responsiveFontSize(10),
              fontWeight: "bold",
              textAlign: "center",
              includeFontPadding: false,
            }}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: {
          paddingHorizontal: 0,
          flex: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.scenarios"),
          tabBarActiveTintColor: "#9333EA",
          tabBarIcon: ({ color }) => <VenetianMask size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="translate"
        options={{
          title: t("tabs.translate"),
          tabBarActiveTintColor: "#2563EB",
          tabBarIcon: ({ color }) => <Languages size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="talk"
        options={{
          title: t("tabs.talk"),
          // Hide the tab completely in Expo Go (native modules not available)
          href: voiceAvailable ? undefined : null,
          tabBarActiveTintColor: "#3b82f6",
          tabBarIcon: ({ color }) => (
            <MessageCircle size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vocab"
        options={{
          title: t("tabs.vocab"),
          tabBarActiveTintColor: "#16A34A",
          tabBarIcon: ({ color }) => (
            <Feather name="book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="language"
        options={{
          title: t("tabs.profile"),
          tabBarActiveTintColor: "#ef4444",
          tabBarIcon: ({ color }) => (
            <View>
              <Globe size={24} color={color} />
              {activeFlag && (
                <View className="absolute -top-1 -right-2 bg-white rounded-full w-4 h-4 items-center justify-center shadow-sm">
                  <Text style={{ fontSize: 8 }}>{activeFlag}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
