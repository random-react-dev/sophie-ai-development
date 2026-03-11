import { supabase } from "@/services/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
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
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token returned from Apple");
      }

      const {
        error,
        data: { user },
      } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) throw error;

      // Apple only provides full name on first sign-in, save it
      if (user && credential.fullName) {
        const nameParts: string[] = [];
        if (credential.fullName.givenName)
          nameParts.push(credential.fullName.givenName);
        if (credential.fullName.familyName)
          nameParts.push(credential.fullName.familyName);
        const fullName = nameParts.join(" ");
        if (fullName) {
          await supabase.auth.updateUser({
            data: { full_name: fullName },
          });
        }
      }
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        e.code === "ERR_REQUEST_CANCELED"
      ) {
        return; // User cancelled, do nothing
      }
      const message = e instanceof Error ? e.message : "Sign in failed";
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
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
          }
          buttonStyle={
            AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
          }
          cornerRadius={12}
          style={{ width: "100%", height: 52 }}
          onPress={handleAppleSignIn}
        />
      )}
    </View>
  );
}
