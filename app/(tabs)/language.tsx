import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import CircleFlag from "@/components/common/CircleFlag";
import { PageHeader } from "@/components/common/PageHeader";
import { RainbowBorder } from "@/components/common/Rainbow";
import AccentPickerModal from "@/components/language/AccentPickerModal";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import {
  DEFAULT_TARGET_LANG,
  Language,
  SUPPORTED_LANGUAGES,
} from "@/constants/languages";
import { CreateProfileDTO } from "@/services/supabase/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
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
import React, { useEffect, useState } from "react";
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
  const { alertState, showAlert, hideAlert } = useAlertModal();
  const { user } = useAuthStore();
  const {
    profiles,
    activeProfile,
    fetchProfiles,
    addProfile,
    switchProfile,
    removeProfile,
  } = useProfileStore();

  // Accent Playground State
  const [testPhrase, setTestPhrase] = useState("Hello, how are you?");
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
  const [newAccent, setNewAccent] = useState("American");

  // Picker Modals
  const [pickerType, setPickerType] = useState<
    "native" | "target" | "medium" | "accent" | null
  >(null);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user, fetchProfiles]);

  const handlePlayAccent = () => {
    setIsPlaying(true);
    // Placeholder for actual TTS
    setTimeout(() => setIsPlaying(false), 2000);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAlert(
      "Play Sound",
      `Speaking "${testPhrase}" with ${
        activeProfile?.preferred_accent || "American"
      } accent at ${speechRate.toFixed(1)}x speed`,
      undefined,
      "info",
    );
  };

  const handleCreateProfile = async () => {
    // Construct name automatically: "Learning [Target] via [Medium/Native]"
    const mediumName = newMediumLang ? newMediumLang.name : newNativeLang.name;
    const profileName = `Learning ${newTargetLang.name}`;

    const newProfileData: CreateProfileDTO = {
      name: profileName,
      native_language: newNativeLang.name,
      target_language: newTargetLang.name,
      medium_language: mediumName,
      preferred_accent: newAccent,
    };

    const success = await addProfile(newProfileData);
    if (success) {
      setIsCreateModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      showAlert(
        "Error",
        "Failed to create profile. Please try again.",
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
    if (activeProfile?.id === id) return;
    Haptics.selectionAsync();
    await switchProfile(id);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      <View className="px-4 mb-6">
        <Text className="text-3xl font-bold text-black text-left">
          Language Preferences
        </Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          Choose your native & target languages and preferred accent.
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
                    <Text className="text-lg font-bold text-gray-900">
                      {profile.name}
                    </Text>
                    <Text className="text-sm font-medium text-gray-500">
                      {profile.native_language} → {profile.target_language}
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
              Create New Profile
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
              <Text className="text-2xl font-bold text-black">
                New Learning Profile
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
                    Learning Preferences
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
                        I want to learn
                      </Text>
                      <Text className="text-gray-900 font-semibold text-base">
                        {newTargetLang.name}
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
                      countryCode={newMediumLang?.countryCode || "in"}
                      size={28}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-500 text-sm">
                        Sophie teaches in
                      </Text>
                      <Text className="text-gray-900 font-semibold text-base">
                        {newMediumLang?.name || "Same as Native"}
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#111827" />
                  </TouchableOpacity>
                  <View className="h-[1px] bg-gray-200" />

                  {/* Preferred Accent Row */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPickerType("accent")}
                    className="flex-row items-center pt-4"
                  >
                    <CircleFlag
                      countryCode={(() => {
                        if (newAccent === "Indian") return "in";
                        if (newAccent === "Australian") return "au";
                        if (newAccent === "American") return "us";
                        if (newAccent === "British") return "gb";
                        return "us";
                      })()}
                      size={28}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-500 text-sm">
                        Preferred accent
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-gray-900 font-semibold text-base">
                          {newAccent}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown size={20} color="#111827" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Accent Playground */}
              <View className="bg-surface rounded-2xl p-5 border border-gray-100 mb-6">
                <View className="flex-row items-center gap-2 mb-4">
                  <Volume2 size={18} color="#374151" />
                  <Text className="text-gray-700 text-base font-semibold capitalize">
                    Accent Playground
                  </Text>
                </View>

                <TextInput
                  value={testPhrase}
                  onChangeText={setTestPhrase}
                  className="h-12 shadow-lg rounded-full flex-row items-center px-4 bg-white mb-4 p-0"
                  placeholder="Type your text here..."
                  placeholderTextColor="gray"
                  textAlignVertical="center"
                  style={{ includeFontPadding: false }}
                />

                {/* Speed Section */}
                <View className="mt-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-900 text-base font-semibold capitalize">
                      Speed
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-gray-700 font-bold text-sm bg-gray-100 px-2 py-1 rounded-lg">
                        {speechRate.toFixed(2)}x
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handlePlayAccent}
                        disabled={isPlaying}
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
                  Test selected accent and adjust speaking speed. Tap Play to
                  preview.
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
                  <Text className="text-black font-bold text-lg">
                    Create Profile
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
        title={`Select ${
          pickerType === "native"
            ? "Your Native"
            : pickerType === "target"
              ? "Target"
              : "Instruction"
        } Language`}
      />

      {/* Accent Picker Modal */}
      <AccentPickerModal
        visible={pickerType === "accent"}
        onClose={() => setPickerType(null)}
        onSelect={(accent) => {
          setNewAccent(accent);
          // Delay closing to allow selection animation to play
          setTimeout(() => setPickerType(null), 300);
        }}
        selectedAccent={newAccent}
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
