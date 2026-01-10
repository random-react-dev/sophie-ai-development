import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { isVoiceModeAvailable } from "@/utils/environment";
import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Globe, Languages, VenetianMask } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Alert, Animated, Platform, Pressable, Text, View } from "react-native";

// Check if voice mode is available (not available in Expo Go)
const voiceAvailable = isVoiceModeAvailable();

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { startPTTRecording, stopPTTRecording, isPTTActive, connectionState } = useConversationStore();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const HOLD_THRESHOLD = 200; // milliseconds

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
          // Hide the tab completely in Expo Go (native modules not available)
          href: voiceAvailable ? undefined : null,
          tabBarButton: voiceAvailable
            ? () => {
                const isFocused = pathname === "/talk";
                const isConnected = connectionState === "connected";

                const handlePressIn = async () => {
                  if (!isFocused) return;

                  // Start scale animation immediately for feedback
                  Animated.spring(scaleAnim, {
                    toValue: 1.1,
                    useNativeDriver: true,
                  }).start();

                  // Set timer - only start recording if held for HOLD_THRESHOLD
                  holdTimerRef.current = setTimeout(async () => {
                    if (isConnected) {
                      isHoldingRef.current = true;
                      await startPTTRecording();
                    }
                  }, HOLD_THRESHOLD);
                };

                const handlePressOut = async () => {
                  // Reset scale animation
                  Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                  }).start();

                  // Clear the hold timer
                  if (holdTimerRef.current) {
                    clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }

                  // If was actually holding (recording started), stop recording
                  if (isHoldingRef.current) {
                    isHoldingRef.current = false;
                    await stopPTTRecording();
                  }
                };

                const handlePress = () => {
                  if (!isFocused) {
                    router.push("/(tabs)/talk");
                  } else if (!isHoldingRef.current && isConnected) {
                    // Was a tap, not a hold - show tooltip
                    Alert.alert("Hold to Speak", "Press and hold the mic button to speak to Sophie.");
                  }
                };

                // Button color based on state
                const getButtonColor = () => {
                  if (isPTTActive) return "bg-red-500 shadow-red-200";
                  if (isFocused && isConnected) return "bg-blue-500 shadow-blue-200";
                  if (isFocused) return "bg-gray-600 shadow-gray-400";
                  return "bg-gray-900 shadow-gray-400";
                };

                return (
                  <Animated.View
                    style={{ transform: [{ scale: scaleAnim }] }}
                    className="items-center justify-center -top-8"
                  >
                    <Pressable
                      onPressIn={handlePressIn}
                      onPressOut={handlePressOut}
                      onPress={handlePress}
                    >
                      {/* Button Microphone */}
                      <View
                        className={`size-20 rounded-3xl items-center justify-center shadow-2xl ${getButtonColor()} border-4 border-white`}
                      >
                        <Feather
                          name={isPTTActive ? "mic" : "mic"}
                          size={26}
                          color="white"
                        />
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              }
            : undefined,
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
