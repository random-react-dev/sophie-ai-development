import { supabase } from "@/services/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// Configure Google Sign-In (skip if credentials not configured)
try {
  if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }
} catch (e) {
  console.warn("Google Sign-In not configured:", e);
}

function GoogleLogo() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleLogo() {
  return (
    <Svg width={26} height={26} viewBox="0 0 16 16" fill="#000000">
      <Path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
    </Svg>
  );
}

export function SocialLoginButtons() {
  const { signInWithGoogle, isLoading } = useAuthStore();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      Alert.alert("Sign In Failed", message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      // Get the redirect URL for deep linking back to the app
      const redirectUrl = Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No OAuth URL returned");

      // Open the OAuth URL in a web browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      if (result.type === "success" && result.url) {
        // Extract the tokens from the URL and set the session
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      Alert.alert("Sign In Failed", message);
    }
  };

  return (
    <View className="space-y-4 w-full">
      <View className="flex-row items-center justify-center my-2">
        <View className="h-[1px] flex-1 bg-gray-200" />
        <Text className="mx-4 text-gray-400 text-sm font-medium">OR</Text>
        <View className="h-[1px] flex-1 bg-gray-200" />
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50 disabled:opacity-50"
      >
        <View className="mr-3">
          <GoogleLogo />
        </View>
        <Text className="text-gray-700 font-semibold text-base">
          {isLoading ? "Signing in..." : "Continue with Google"}
        </Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={isLoading}
          className="w-full flex-row items-center justify-center bg-white border border-gray-200 rounded-xl py-3.5 shadow-sm active:bg-gray-50 disabled:opacity-50"
        >
          <View className="mr-3">
            <AppleLogo />
          </View>
          <Text className="text-gray-700 font-semibold text-base">
            {isLoading ? "Signing in..." : "Continue with Apple"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
