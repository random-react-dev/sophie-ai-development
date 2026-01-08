import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Globe, Languages, VenetianMask } from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleConversation, isConversationActive } = useConversationStore();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchProfiles();
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
          height: Platform.OS === "ios" ? 88 : 70,
          paddingBottom: Platform.OS === "ios" ? 30 : 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Roleplay",
          tabBarActiveTintColor: "#9333EA",
          tabBarIcon: ({ color }) => <VenetianMask size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="translate"
        options={{
          title: "Translate",
          tabBarActiveTintColor: "#2563EB",
          tabBarIcon: ({ color }) => <Languages size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="talk"
        options={{
          title: "",
          tabBarButton: () => {
            const isFocused = pathname === "/talk";

            const handlePress = () => {
              if (isFocused) {
                // Toggle conversation mode on/off
                toggleConversation();
              } else {
                router.push("/(tabs)/talk");
              }
            };

            // Button color based on state
            const getButtonColor = () => {
              if (isConversationActive) return "bg-red-500 shadow-red-200";
              if (isFocused) return "bg-blue-500 shadow-blue-200";
              return "bg-gray-900 shadow-gray-400";
            };

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePress}
                className="items-center justify-center -top-8"
              >
                {/* Button Microphone */}
                <View
                  className={`size-20 rounded-3xl items-center justify-center shadow-2xl ${getButtonColor()} border-4 border-white`}
                >
                  {isConversationActive ? (
                    <Feather name="mic-off" size={26} color="white" />
                  ) : (
                    <Feather name="mic" size={26} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            );
          },
        }}
      />
      <Tabs.Screen
        name="vocab"
        options={{
          title: "Vocab",
          tabBarActiveTintColor: "#16A34A",
          tabBarIcon: ({ color }) => (
            <Feather name="book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="language"
        options={{
          title: "Language",
          tabBarActiveTintColor: "#EA580C",
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
