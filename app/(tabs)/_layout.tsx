import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { isVoiceModeAvailable } from "@/utils/environment";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Globe, Languages, VenetianMask } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, Text, View } from "react-native";

// Check if voice mode is available (not available in Expo Go)
const voiceAvailable = isVoiceModeAvailable();

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { startPTTRecording, stopPTTRecording, isPTTActive, connectionState } = useConversationStore();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isPressing, setIsPressing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  // Pulsing animation when recording
  useEffect(() => {
    if (!isPTTActive) {
      pulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [isPTTActive]);

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

                const handlePressIn = () => {
                  if (!isFocused) return;

                  setIsPressing(true);

                  Animated.spring(scaleAnim, {
                    toValue: 1.1,
                    useNativeDriver: true,
                  }).start();

                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                };

                const handlePressOut = () => {
                  setIsPressing(false);

                  Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                  }).start();

                  if (isPTTActive) {
                    stopPTTRecording();
                  }
                };

                const handleLongPress = () => {
                  if (!isFocused || !isConnected) return;

                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startPTTRecording();
                };

                const handlePress = () => {
                  if (!isFocused) {
                    router.push("/(tabs)/talk");
                  }
                };

                const getButtonColor = () => {
                  if (isPTTActive) return "bg-red-500 shadow-red-200";
                  if (!isFocused) return "bg-gray-900 shadow-gray-400";
                  if (!isConnected) return "bg-gray-600 shadow-gray-400";
                  if (isPressing) return "bg-blue-400 shadow-blue-200";
                  return "bg-blue-500 shadow-blue-200";
                };

                return (
                  <Animated.View
                    style={{ transform: [{ scale: scaleAnim }] }}
                    className="items-center justify-center -top-8"
                  >
                    {/* Pulsing ring when recording */}
                    {isPTTActive && (
                      <Animated.View
                        style={{
                          position: 'absolute',
                          width: 80,
                          height: 80,
                          borderRadius: 24,
                          backgroundColor: 'rgba(239, 68, 68, 0.3)',
                          transform: [{ scale: pulseAnim }],
                        }}
                      />
                    )}
                    <Pressable
                      onPressIn={handlePressIn}
                      onPressOut={handlePressOut}
                      onLongPress={handleLongPress}
                      delayLongPress={400}
                      onPress={handlePress}
                    >
                      <View
                        className={`size-20 rounded-3xl items-center justify-center shadow-2xl ${getButtonColor()} border-4 border-white`}
                      >
                        <Feather name="mic" size={26} color="white" />
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
