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
    bundleIdentifier: "com.fluentai.sophie",
    infoPlist: {
      NSMicrophoneUsageDescription:
        "Allow Fluent-AI to use the microphone for voice conversations.",
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
    "expo-localization",
    "expo-audio",
    "expo-asset",
    [
      "expo-av",
      {
        microphonePermission:
          "Allow Sophie to access your microphone for voice conversations.",
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
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
