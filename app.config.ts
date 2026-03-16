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
    usesAppleSignIn: true,
    supportsTablet: false,
    bundleIdentifier: "ai.speakwithsophie.app",
    buildNumber: "41",
    infoPlist: {
      NSMicrophoneUsageDescription:
        "Sophie AI needs microphone access to hear your voice during conversations. Audio is processed in real-time and is not recorded or stored.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: "ai.speakwithsophie.app",
    versionCode: 5,
    permissions: ["android.permission.RECORD_AUDIO"],
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "./plugins/withAndroidReleaseSigning",
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          image: "./assets/images/splash-icon.png",
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
    ["react-native-audio-api", { iosBackgroundMode: false }],
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
          "Sophie AI uses speech recognition to convert your voice into text during conversations. Your speech is processed to generate AI responses. No audio recordings are stored.",
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
