import { RainbowBorder } from "@/components/common/Rainbow";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { isVoiceModeAvailable } from "@/utils/environment";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Globe, Languages, VenetianMask } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Pressable, Text, View } from "react-native";
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
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    startPTTRecording,
    stopPTTRecording,
    isPTTActive,
    isProcessing,
    connectionState,
  } = useConversationStore();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isPressing, setIsPressing] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  // Determine if Talk tab is focused
  const isTalkFocused = pathname === "/talk";

  // Scale animation for active state (subtle lift when focused)
  const activeScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(activeScaleAnim, {
      toValue: isTalkFocused ? 1.08 : 1, // Slightly larger when focused
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  }, [isTalkFocused]);

  // Pulsing animation ONLY when recording
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
      ]),
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
          // Use a safer height calculation that works across devices
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          paddingHorizontal: 8,
          // CRITICAL: Allow floating buttons to extend outside the tab bar
          overflow: "visible",
          // Ensure tab bar sits above other content if needed
          zIndex: 50,
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
          title: "Translate", // Keeping as is, not in prototype scope list but can update if needed
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

                const getButtonColor = (): string => {
                  if (isPTTActive) return "bg-red-500 shadow-red-200";
                  if (isProcessing) return "bg-orange-500 shadow-orange-200";
                  if (!isFocused) return "bg-gray-900 shadow-gray-400";
                  if (!isConnected) return "bg-gray-600 shadow-gray-400";
                  return isPressing
                    ? "bg-blue-400 shadow-blue-200"
                    : "bg-blue-500 shadow-blue-200";
                };

                return (
                  <Animated.View
                    style={{
                      transform: [
                        {
                          scale: Animated.multiply(activeScaleAnim, scaleAnim),
                        },
                      ],
                    }}
                    className="items-center justify-center -top-8"
                  >
                    {/* Pulsing ring when recording ONLY */}
                    {isPTTActive && (
                      <Animated.View
                        style={{
                          position: "absolute",
                          width: 80,
                          height: 80,
                          borderRadius: 24,
                          backgroundColor: "rgba(239, 68, 68, 0.3)",
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
                      <RainbowBorder
                        borderRadius={20}
                        borderWidth={3}
                        className="size-20"
                        style={{
                          // Subtle premium shadow when active
                          shadowColor:
                            isFocused && !isPTTActive ? "#70369D" : "#000",
                          shadowOffset: { width: 0, height: isFocused ? 3 : 2 },
                          shadowOpacity:
                            isFocused && !isPTTActive ? 0.25 : 0.15,
                          shadowRadius: isFocused && !isPTTActive ? 8 : 4,
                          elevation: isFocused && !isPTTActive ? 8 : 4,
                        }}
                        containerClassName={`items-center justify-center ${getButtonColor()}`}
                      >
                        <Feather
                          name="mic"
                          size={26}
                          color={
                            isFocused && !isPTTActive ? "#FFA500" : "black"
                          }
                        />
                      </RainbowBorder>
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
