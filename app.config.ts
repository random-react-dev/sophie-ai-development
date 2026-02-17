import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "sophie",
  slug: "sophie",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "sophie",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "ai.speakwithsophie.app",
    buildNumber: "15",
    infoPlist: {
      NSMicrophoneUsageDescription:
        "Allow Fluent-AI to use the microphone for voice conversations.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: "com.fluentai.sophie",
    permissions: ["android.permission.RECORD_AUDIO"],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "expo-secure-store",
    [
      "expo-localization",
      {
        supportedLocales: {
          ios: ["en", "hi", "es", "fr", "de", "ja", "zh"],
          android: ["en", "hi", "es", "fr", "de", "ja", "zh"],
        },
      },
    ],
    "expo-audio",
    "expo-asset",
    [
      "expo-av",
      {
        microphonePermission:
          "Allow Sophie AI to access your microphone for voice conversations.",
      },
    ],
    "expo-stream-audio",
    "react-native-audio-api",
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/GoogleSans-Regular.ttf",
          "./assets/fonts/GoogleSans-Medium.ttf",
          "./assets/fonts/GoogleSans-Bold.ttf",
        ],
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "Allow Sophie AI to use the microphone for voice input.",
        speechRecognitionPermission:
          "Allow Sophie AI to use speech recognition.",
      },
    ],
    // Google Sign-In - Uncomment when EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME is configured
    // [
    //   "@react-native-google-signin/google-signin",
    //   {
    //     iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
    //   },
    // ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
