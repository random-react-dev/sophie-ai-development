import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { TrialCountdownModal } from "@/components/auth/TrialCountdownModal";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";

// Suppress expo-av deprecation warning (still works in SDK 54, will migrate in future)
LogBox.ignoreLogs(["expo-av"]);

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const { session, initialized, initialize } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const segments = useSegments();
  const router = useRouter();
  const hasInitialRedirect = useRef(false);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "GoogleSans-Regular": require("../assets/fonts/GoogleSans-Regular.ttf"),
    "GoogleSans-Medium": require("../assets/fonts/GoogleSans-Medium.ttf"),
    "GoogleSans-Bold": require("../assets/fonts/GoogleSans-Bold.ttf"),
  });

  useEffect(() => {
    if (!initialized) {
      initialize();
      loadTheme();
    }
  }, [initialized, initialize, loadTheme]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inTabsGroup = segments[0] === "(tabs)";

    // Check if onboarding is completed from user metadata
    const onboardingCompleted =
      session?.user?.user_metadata?.onboarding_data?.completed_at;

    if (session) {
      if (!onboardingCompleted) {
        // User is signed in but hasn't finished onboarding
        if (!inOnboardingGroup) {
          router.replace("/(onboarding)/onboarding");
        }
      } else {
        // User is signed in and finished onboarding
        // Redirect to Talk tab as the main learning page
        if (inAuthGroup || inOnboardingGroup) {
          router.replace("/(tabs)/talk");
        }
        // Also redirect to Talk when app reloads on default index page (only once)
        else if (
          inTabsGroup &&
          segments[1] === undefined &&
          !hasInitialRedirect.current
        ) {
          // User landed on tabs without specific route (default index)
          hasInitialRedirect.current = true;
          router.replace("/(tabs)/talk");
        }
      }
    } else if (!inAuthGroup) {
      // User is not signed in and not in auth group
      router.replace("/(auth)/login");
    }
  }, [session, segments, initialized, router]);

  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(onboarding)"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="profile"
                options={{ headerShown: false, presentation: "card" }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
            <TrialCountdownModal />
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
