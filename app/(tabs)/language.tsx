import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import CircleFlag from "@/components/common/CircleFlag";
import { PageHeader } from "@/components/common/PageHeader";
import { RainbowBorder } from "@/components/common/Rainbow";
import AccentPickerModal from "@/components/language/AccentPickerModal";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import { AccentVariant, getDefaultAccent } from "@/constants/accents";
import {
  DEFAULT_TARGET_LANG,
  Language,
  SUPPORTED_LANGUAGES,
} from "@/constants/languages";
import { CEFR_LEVELS } from "@/constants/scenarios";
import { useTranslation } from "@/hooks/useTranslation";
import { speakWord, stopSpeaking } from "@/services/audio/tts";
import { Logger } from "@/services/common/Logger";
import { LANGUAGE_NAMES } from "@/services/i18n/languageNames";
import { CreateProfileDTO } from "@/services/supabase/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useLearningStore } from "@/stores/learningStore";
import { useProfileStore } from "@/stores/profileStore";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronDown,
  Folder,
  Globe,
  Play,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LanguageScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { alertState, showAlert, hideAlert } = useAlertModal();
  const { user } = useAuthStore();
  const { cefrLevel, setCefrLevel } = useLearningStore();
  const {
    profiles,
    activeProfile,
    fetchProfiles,
    addProfile,
    switchProfile,
    removeProfile,
  } = useProfileStore();

  const getLocalizedLanguageName = useCallback(
    (englishName: string) => {
      const matchedLang = SUPPORTED_LANGUAGES.find(
        (l) => l.name === englishName,
      );
      if (!matchedLang) return englishName;

      // Try Intl.DisplayNames first
      try {
        const localized = new Intl.DisplayNames([locale], {
          type: "language",
        }).of(matchedLang.code);

        if (localized && localized !== englishName) {
          return localized.charAt(0).toUpperCase() + localized.slice(1);
        }

        if (locale.startsWith("en")) return englishName;
      } catch (error) {
        // Fallback below
      }

      // Fallback: Manual Map
      // Normalize locale (e.g. 'hi-IN' -> 'hi')
      const simpleLocale = locale.split("-")[0];
      // @ts-ignore
      const manualName = LANGUAGE_NAMES[simpleLocale]?.[matchedLang.code];
      if (manualName) return manualName;

      // Final valid fallback: Native Name
      return matchedLang.nativeName || englishName;
    },
    [locale],
  );

  // Accent Playground State
  const [testPhrase, setTestPhrase] = useState(
    t("language_screen.sections.default_test_phrase"),
  );
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Profile Creation State
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newNativeLang, setNewNativeLang] = useState<Language>(
    SUPPORTED_LANGUAGES.find((l) => l.name === "Hindi") ||
      SUPPORTED_LANGUAGES[0],
  );
  const [newTargetLang, setNewTargetLang] =
    useState<Language>(DEFAULT_TARGET_LANG);
  const [newMediumLang, setNewMediumLang] = useState<Language | null>(null); // Optional
  const [newAccent, setNewAccent] = useState<AccentVariant>(
    getDefaultAccent(DEFAULT_TARGET_LANG.code),
  );

  // Picker Modals
  const [pickerType, setPickerType] = useState<
    "native" | "target" | "medium" | "accent" | null
  >(null);

  // Sync with user preference or active profile when modal opens
  useEffect(() => {
    if (isCreateModalVisible) {
      let defaultNative: Language | undefined;

      // 1. Try Global User Preference (Code)
      const globalNativeCode = user?.user_metadata?.native_language;
      if (globalNativeCode) {
        defaultNative = SUPPORTED_LANGUAGES.find(
          (l) => l.code === globalNativeCode,
        );
      }

      // 2. Fallback to Active Profile (Name)
      if (!defaultNative && activeProfile?.native_language) {
        defaultNative = SUPPORTED_LANGUAGES.find(
          (l) => l.name === activeProfile.native_language,
        );
      }

      // 3. Apply Default
      if (defaultNative) {
        setNewNativeLang(defaultNative);
        setNewMediumLang(null); // Default to "Same as Native"

        // 4. Ensure Target != Native
        if (defaultNative.code === newTargetLang.code) {
          // If default target (Hindi) matches native, switch to English or Spanish
          const fallbackTarget =
            defaultNative.code === "en"
              ? SUPPORTED_LANGUAGES.find((l) => l.code === "es")
              : SUPPORTED_LANGUAGES.find((l) => l.code === "en");
          if (fallbackTarget) {
            setNewTargetLang(fallbackTarget);
          }
        }
      }
    }
  }, [isCreateModalVisible, activeProfile, user]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user, fetchProfiles]);

  // Reset accent when target language changes
  useEffect(() => {
    setNewAccent(getDefaultAccent(newTargetLang.code));
  }, [newTargetLang.code]);

  const handlePlayAccent = () => {
    // Toggle: stop if already playing
    if (isPlaying) {
      void stopSpeaking();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    void speakWord(
      testPhrase,
      newTargetLang.name,
      {
        onStart: () => setIsPlaying(true),
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      },
      speechRate,
      newAccent.bcp47,
    );
  };

  const handleCreateProfile = async () => {
    // Construct name automatically: "Learning [Target] via [Medium/Native]"
    const mediumName = newMediumLang ? newMediumLang.name : newNativeLang.name;
    const profileName = `Learning ${newTargetLang.name}`;

    // Validate: Check if profile already exists
    const duplicateProfile = profiles.find(
      (p) =>
        p.target_language === newTargetLang.name &&
        (p.medium_language === mediumName ||
          (!p.medium_language && p.native_language === mediumName)),
    );

    if (duplicateProfile) {
      showAlert(
        t("common.error"),
        t("language_screen.modals.duplicate_profile_error"),
        undefined,
        "error",
      );
      return;
    }

    const newProfileData: CreateProfileDTO = {
      name: profileName,
      native_language: newNativeLang.name,
      target_language: newTargetLang.name,
      medium_language: mediumName,
      preferred_accent: newAccent.bcp47,
    };

    const success = await addProfile(newProfileData);
    if (success) {
      setIsCreateModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      showAlert(
        t("common.error"),
        t("language_screen.modals.create_error"),
        undefined,
        "error",
      );
    }
  };

  const handleDeleteProfile = (id: string) => {
    showAlert(
      "Delete Profile",
      "Are you sure? This will delete your progress for this language.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeProfile(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
      "warning",
    );
  };

  const handleSwitchProfile = async (id: string) => {
    Logger.info("LanguageScreen", `Switching profile to ${id}`);
    if (activeProfile?.id === id) {
      Logger.info(
        "LanguageScreen",
        "Profile already active, navigating to talk",
      );
      router.replace("/(tabs)/talk");
      return;
    }

    try {
      Haptics.selectionAsync();
      Logger.info("LanguageScreen", "Calling switchProfile store action");
      await switchProfile(id);
      Logger.info("LanguageScreen", "Profile switched, navigating to talk");

      // Use replace to avoid stacking navigation history
      router.replace("/(tabs)/talk");
    } catch (error) {
      Logger.error("LanguageScreen", "Failed to switch profile", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      <View className="px-4 mb-6">
        <Text className="text-xl font-bold text-black text-left">
          {t("language_screen.title")}
        </Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          {t("language_screen.subtitle")}
        </Text>
      </View>

      <ScrollView className="flex-1 " showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-24">
          {/* Profiles List (Folders) */}
          {/* <Text className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
            My Language Profile
          </Text> */}
          {profiles.map((profile) => {
            // Inner content only - no container styling
            const ProfileInner = () => (
              <>
                <View className="flex-row items-center gap-4 flex-1">
                  <View className="w-12 h-12 rounded-full items-center justify-center">
                    {(() => {
                      const targetLang = SUPPORTED_LANGUAGES.find(
                        (l) => l.name === profile.target_language,
                      );
                      if (targetLang) {
                        return (
                          <CircleFlag
                            countryCode={targetLang.countryCode}
                            size={32}
                          />
                        );
                      }
                      return (
                        <Folder
                          size={24}
                          color={profile.is_active ? "#111827" : "#3b82f6"}
                          strokeWidth={2}
                        />
                      );
                    })()}
                  </View>
                  <View>
                    <Text className="text-base font-bold text-gray-900">
                      {profile.name}
                    </Text>
                    <Text className="text-sm font-medium text-gray-500">
                      {getLocalizedLanguageName(
                        profile.medium_language || profile.native_language,
                      )}{" "}
                      → {getLocalizedLanguageName(profile.target_language)}
                    </Text>
                  </View>
                </View>

                <View>
                  {profile.is_active ? (
                    <View className="w-10 h-10 rounded-full bg-green-500 items-center justify-center">
                      <CheckCircle2 size={20} color="white" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDeleteProfile(profile.id)}
                      className="w-10 h-10 rounded-full bg-red-50 items-center justify-center"
                    >
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            );

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                key={profile.id}
                onPress={() => handleSwitchProfile(profile.id)}
                className="mb-4 shadow-lg rounded-2xl bg-white"
                // Remove border from here as it's handled inside for inactive, or via Rainbow for active
              >
                {profile.is_active ? (
                  <RainbowBorder
                    borderWidth={2}
                    borderRadius={16} // Rounded-2xl ~ 16px
                    className="w-full"
                    containerClassName="flex-row items-center justify-between p-5" // Removed w-full to fix overflow
                    innerBackgroundClassName="bg-white"
                  >
                    <ProfileInner />
                  </RainbowBorder>
                ) : (
                  <View className="w-full flex-row items-center justify-between p-5 border border-gray-100 rounded-2xl bg-white">
                    <ProfileInner />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsCreateModalVisible(true)}
            className="p-5 rounded-2xl border-2 border-dashed border-gray-300 flex-row items-center justify-center gap-2 mt-2"
          >
            <Plus size={24} color="#6b7280" />
            <Text className="text-gray-500 font-bold text-base">
              {t("language_screen.create_profile_btn")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Profile Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <SafeAreaView className="flex-1">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <Text
                className="text-xl font-bold text-black flex-1 mr-4"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {t("language_screen.modals.create_title")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsCreateModalVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-4 pt-6"
              showsVerticalScrollIndicator={false}
            >
              {/* Learning Preferences Card - Same UI as was on main page */}
              <View className="bg-surface rounded-2xl p-5 border border-gray-100 shadow-sm shadow-gray-100 mb-6">
                {/* Section Header */}
                <View className="flex-row items-center gap-2 mb-2">
                  <Globe size={18} color="#374151" />
                  <Text className="text-gray-700 text-base font-semibold capitalize">
                    {t("language_screen.sections.learning_preferences")}
                  </Text>
                </View>

                {/* Preference Rows */}
                <View>
                  {/* Target Language Row */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPickerType("target")}
                    className="flex-row items-center py-4"
                  >
                    <CircleFlag
                      countryCode={newTargetLang.countryCode}
                      size={28}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-500 text-sm">
                        {t("language_screen.modals.sections.target_label")}
                      </Text>
                      <Text className="text-gray-900 font-semibold text-base">
                        {getLocalizedLanguageName(newTargetLang.name)}
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#111827" />
                  </TouchableOpacity>
                  <View className="h-[1px] bg-gray-200" />

                  {/* Sophie teaches in (Instruction Language) */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPickerType("medium")}
                    className="flex-row items-center py-4"
                  >
                    <CircleFlag
                      countryCode={
                        newMediumLang?.countryCode || newNativeLang.countryCode
                      }
                      size={28}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-500 text-sm">
                        {t("language_screen.modals.sections.medium_label")}
                      </Text>
                      <Text className="text-gray-900 font-semibold text-base">
                        {newMediumLang?.name
                          ? getLocalizedLanguageName(newMediumLang.name)
                          : getLocalizedLanguageName(newNativeLang.name)}
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#111827" />
                  </TouchableOpacity>
                  <View className="h-[1px] bg-gray-200" />

                  {/* Preferred Accent Row */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPickerType("accent")}
                    className="flex-row items-center pt-4 pb-4"
                  >
                    <CircleFlag
                      countryCode={newAccent.countryCode || "us"}
                      size={28}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-500 text-sm">
                        {t("language_screen.modals.sections.accent_label")}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-gray-900 font-semibold text-base">
                          {newAccent.name}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown size={20} color="#111827" />
                  </TouchableOpacity>
                  <View className="h-[1px] bg-gray-200" />

                  {/* Level Selector (S1-S6) */}
                  <View className="pt-4">
                    <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                      {t("onboarding.profileStep.levelLabel")}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mt-1"
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {CEFR_LEVELS.map((l) => {
                        const isSelected = cefrLevel === l;

                        if (isSelected) {
                          return (
                            <TouchableOpacity
                              key={l}
                              activeOpacity={0.7}
                              onPress={() => setCefrLevel(l)}
                            >
                              <RainbowBorder
                                borderRadius={9999}
                                borderWidth={1}
                                containerClassName="px-4 py-2"
                              >
                                <Text className="font-bold text-sm text-black">
                                  {l}
                                </Text>
                              </RainbowBorder>
                            </TouchableOpacity>
                          );
                        }

                        return (
                          <TouchableOpacity
                            key={l}
                            activeOpacity={0.7}
                            onPress={() => setCefrLevel(l)}
                            className="px-4 py-2 rounded-full border border-gray-300"
                          >
                            <Text className="font-bold text-sm text-gray-600">
                              {l}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Accent Playground */}
              <View className="bg-surface rounded-2xl p-5 border border-gray-100 mb-6">
                <View className="flex-row items-center gap-2 mb-4">
                  <Volume2 size={18} color="#374151" />
                  <Text className="text-gray-700 text-base font-semibold capitalize">
                    {t("language_screen.sections.accent_playground")}
                  </Text>
                </View>

                <TextInput
                  value={testPhrase}
                  onChangeText={setTestPhrase}
                  className="h-12 shadow-lg rounded-full flex-row items-center px-4 bg-white mb-4 p-0 text-sm"
                  placeholder={t("language_screen.sections.text_placeholder")}
                  placeholderTextColor="gray"
                  textAlignVertical="center"
                  style={{ includeFontPadding: false }}
                />

                {/* Speed Section */}
                <View className="mt-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-900 text-base font-semibold capitalize">
                      {t("language_screen.sections.speed_label")}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-gray-700 font-bold text-sm bg-gray-100 px-2 py-1 rounded-lg">
                        {speechRate.toFixed(2)}x
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handlePlayAccent}
                      >
                        <RainbowBorder
                          borderRadius={9999}
                          borderWidth={2}
                          containerClassName="w-8 h-8 items-center justify-center"
                        >
                          {isPlaying ? (
                            <ActivityIndicator size="small" color="black" />
                          ) : (
                            <Play size={14} color="black" fill="black" />
                          )}
                        </RainbowBorder>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Slider
                    style={{ width: "100%", height: 50 }}
                    minimumValue={0.25}
                    maximumValue={2.0}
                    step={0.05}
                    value={speechRate}
                    onValueChange={setSpeechRate}
                    minimumTrackTintColor="#374151"
                    maximumTrackTintColor="#d1d5db"
                    thumbTintColor="#374151"
                  />

                  <View className="flex-row justify-between px-1">
                    <Text className="text-sm text-gray-400 font-bold">
                      0.25x
                    </Text>
                    <Text className="text-sm text-gray-400 font-bold">
                      1.0x
                    </Text>
                    <Text className="text-sm text-gray-400 font-bold">
                      2.0x
                    </Text>
                  </View>
                </View>

                <Text className="text-center text-gray-500 text-sm mt-4 leading-normal">
                  {t("language_screen.sections.playground_hint")}
                </Text>
              </View>
            </ScrollView>

            <View className="px-4 py-8 border-t border-gray-100">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCreateProfile}
                className="w-full h-16 rounded-full overflow-hidden shadow-lg"
              >
                <RainbowBorder
                  borderWidth={2}
                  borderRadius={9999}
                  className="flex-1"
                  containerClassName="items-center justify-center"
                >
                  <Text
                    className="text-black font-bold text-lg"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {t("language_screen.modals.create_button")}
                  </Text>
                </RainbowBorder>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Picker Modal - Shared across main screen and create profile */}
      <LanguagePickerModal
        visible={pickerType !== null && pickerType !== "accent"}
        onClose={() => setPickerType(null)}
        onSelect={(lang) => {
          if (pickerType === "native") setNewNativeLang(lang);
          if (pickerType === "target") setNewTargetLang(lang);
          if (pickerType === "medium") setNewMediumLang(lang);
          setPickerType(null);
        }}
        selectedCode={
          pickerType === "native"
            ? newNativeLang.code
            : pickerType === "target"
              ? newTargetLang.code
              : newMediumLang?.code
        }
        title={
          pickerType === "native"
            ? t("language_picker.select_native")
            : pickerType === "target"
              ? t("language_picker.select_target")
              : t("language_picker.select_instruction")
        }
      />

      {/* Accent Picker Modal */}
      <AccentPickerModal
        visible={pickerType === "accent"}
        onClose={() => setPickerType(null)}
        onSelect={(accent: AccentVariant) => {
          setNewAccent(accent);
          // Delay closing to allow selection animation to play
          setTimeout(() => setPickerType(null), 300);
        }}
        selectedAccent={newAccent.bcp47}
        targetLanguageCode={newTargetLang.code}
      />

      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
}
