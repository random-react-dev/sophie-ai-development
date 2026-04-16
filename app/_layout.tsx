import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { AppState, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import TwoFactorOTPModal from "@/components/auth/TwoFactorOTPModal";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { initIAP, setupPurchaseListeners } from "@/services/iap/client";
import { useAuthStore } from "@/stores/authStore";
import { useEntitlementStore } from "@/stores/entitlementStore";
import { useThemeStore } from "@/stores/themeStore";

// Suppress expo-av deprecation warning (still works in SDK 54, will migrate in future)
LogBox.ignoreLogs(["expo-av"]);

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

const PENDING_DEEP_LINK_KEY = "pending-scenario-token";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const { session, initialized, initialize, pending2FA, isLoading } =
    useAuthStore();
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

  // Initialize Apple IAP listeners + entitlement refresh once the user is signed in.
  useEffect(() => {
    if (!session?.user) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await initIAP();
      if (cancelled) return;
      cleanup = setupPurchaseListeners(() => {
        // Re-pull from `subscriptions` table (the verify-purchase function just upserted).
        useEntitlementStore.getState().refresh();
      });
      // Initial refresh on sign-in.
      useEntitlementStore.getState().refresh();
    })();

    // Refresh entitlement on app foreground.
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useEntitlementStore.getState().refresh();
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
      appStateSub.remove();
    };
  }, [session?.user]);

  // Capture incoming deep links (sophie://scenario/{token})
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith("scenario/")) {
        const token = parsed.path.replace("scenario/", "");
        if (!token) return;
        if (session) {
          router.push(`/scenario/${token}` as never);
        } else {
          AsyncStorage.setItem(PENDING_DEEP_LINK_KEY, token);
        }
      }
    };

    // Handle URL that cold-started the app
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle URL while app is already open
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [session, router]);

  useEffect(() => {
    if (!initialized) return;

    // Don't navigate while auth operations (signIn/signUp/signOut) are in progress.
    // This prevents the SIGNED_IN event from triggering premature navigation
    // before signIn has finished checking for 2FA.
    if (isLoading) return;

    // Don't navigate while 2FA verification is pending.
    // During the 2FA flow, session is null (signOut was called intentionally),
    // but we must stay put so the OTP modal can show.
    if (pending2FA) return;

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
          AsyncStorage.getItem(PENDING_DEEP_LINK_KEY).then((pendingToken) => {
            if (pendingToken) {
              AsyncStorage.removeItem(PENDING_DEEP_LINK_KEY);
              router.replace(`/scenario/${pendingToken}` as never);
            } else {
              router.replace("/(tabs)/talk");
            }
          });
        }
        // Also redirect to Talk when app reloads on default index page (only once)
        else if (
          inTabsGroup &&
          (segments[1] === undefined || (segments[1] as string) === "index") &&
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
  }, [session, segments, initialized, router, pending2FA, isLoading]);

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
              <Stack.Screen
                name="scenario"
                options={{ headerShown: false }}
              />
            </Stack>
            <TwoFactorOTPModal />
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
