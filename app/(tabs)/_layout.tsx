import { RainbowBorder } from "@/components/common/Rainbow";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { useTranslation } from "@/hooks/useTranslation";
import { Logger } from "@/services/common/Logger";
import { useAuthStore } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useProfileStore } from "@/stores/profileStore";
import { useVocabularyStore } from "@/stores/vocabularyStore";
import { isVoiceModeAvailable } from "@/utils/environment";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Globe, Languages, VenetianMask } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Remote logging for physical device debugging
// Enable only when explicitly requested to avoid audio-path overhead.
const ENABLE_REMOTE_LOGGING =
  process.env.EXPO_PUBLIC_ENABLE_REMOTE_LOGGING === "1";
if (ENABLE_REMOTE_LOGGING) {
  Logger.enableRemoteLogging("http://192.168.1.3:8899/log");
}

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

function MicTabButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const {
    connectionState,
    isPTTActive,
    isProcessing,
    startPTTRecording,
    stopPTTRecording,
  } = useConversationStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pttStartPromiseRef = useRef<Promise<void> | null>(null);
  const pressSessionIdRef = useRef(0);
  const activePressSessionRef = useRef<number | null>(null);
  const isTalkTab = pathname === "/talk";

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
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isPTTActive, pulseAnim]);

  const handlePressIn = (sessionId: number) => {
    if (activePressSessionRef.current === sessionId) return;
    if (!isTalkTab) {
      router.push("/(tabs)/talk");
      return;
    }
    if (connectionState !== "connected") return;
    activePressSessionRef.current = sessionId;
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pttStartPromiseRef.current = startPTTRecording().catch((err: unknown) => {
      Logger.error("MicTabButton", "Failed to start PTT recording", err);
    });
  };

  const handlePressOut = (sessionId: number) => {
    if (activePressSessionRef.current !== sessionId) return;
    activePressSessionRef.current = null;
    if (!isTalkTab) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    const startPromise = pttStartPromiseRef.current;
    pttStartPromiseRef.current = null;
    if (startPromise) {
      startPromise.then(() => stopPTTRecording()).catch(() => {});
    } else {
      stopPTTRecording();
    }
  };

  const holdGesture = Gesture.LongPress()
    .minDuration(1)
    .maxDistance(200)
    .runOnJS(true)
    .onStart(() => {
      const sessionId = ++pressSessionIdRef.current;
      handlePressIn(sessionId);
    })
    .onEnd((_event, success) => {
      if (!success) return;
      const activeSession = activePressSessionRef.current;
      if (activeSession !== null) {
        handlePressOut(activeSession);
      }
    })
    .onFinalize(() => {
      const activeSession = activePressSessionRef.current;
      if (activeSession !== null) {
        handlePressOut(activeSession);
      } else {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    });

  const getButtonColor = (): string => {
    if (isPTTActive) return "bg-white shadow-red-200";
    if (isProcessing) return "bg-white shadow-orange-200";
    if (!isTalkTab) return "bg-gray-100 shadow-gray-200";
    if (connectionState === "connecting" || connectionState === "reconnecting")
      return "bg-yellow-50 shadow-yellow-200";
    if (connectionState !== "connected") return "bg-gray-100 shadow-gray-200";
    return "bg-white shadow-blue-200";
  };

  return (
    <View
      testID="mic-tab-button"
      className="items-center justify-center -top-8"
      style={{ zIndex: 50 }}
    >
      {/* Pulse ring when recording */}
      {isPTTActive && (
        <Animated.View
          style={{
            position: "absolute",
            width: 72,
            height: 72,
            borderRadius: 9999,
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            transform: [{ scale: pulseAnim }],
          }}
        />
      )}
      <GestureDetector gesture={holdGesture}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <RainbowBorder
            borderRadius={9999}
            borderWidth={2.5}
            className="w-[72px] h-[72px]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
            containerClassName={`items-center justify-center ${getButtonColor()}`}
          >
            <Feather
              name={
                connectionState === "connecting" ||
                connectionState === "reconnecting"
                  ? "loader"
                  : "mic"
              }
              size={28}
              color={
                isPTTActive
                  ? "#ef4444"
                  : connectionState === "connecting" ||
                      connectionState === "reconnecting"
                    ? "#f59e0b"
                    : "black"
              }
            />
          </RainbowBorder>
        </Animated.View>
      </GestureDetector>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: "GoogleSans-Bold",
          fontSize: responsiveFontSize(10),
          fontWeight: "bold",
          textAlign: "center",
          color: isTalkTab ? "#3b82f6" : "#94a3b8",
          marginTop: 4,
        }}
      >
        {t("tabs.talk")}
      </Text>
    </View>
  );
}

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
  }, [user, fetchProfiles, fetchVocabulary]);

  // Find flag for active profile target language
  const activeFlag = activeProfile
    ? SUPPORTED_LANGUAGES.find((l) => l.name === activeProfile.target_language)
        ?.flag
    : null;

  return (
    <Tabs
      initialRouteName="talk"
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
          overflow: "visible" as const,
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="scenarios"
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
          href: voiceAvailable ? undefined : null,
          tabBarButton: () => <MicTabButton />,
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
