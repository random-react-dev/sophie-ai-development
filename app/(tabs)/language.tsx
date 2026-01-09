import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import {
  DEFAULT_TARGET_LANG,
  Language,
  SUPPORTED_LANGUAGES,
} from "@/constants/languages";
import { CreateProfileDTO } from "@/services/supabase/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  ArrowRightLeft,
  CheckCircle2,
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
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LanguageScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const {
    profiles,
    activeProfile,
    isLoading,
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
      SUPPORTED_LANGUAGES[0]
  );
  const [newTargetLang, setNewTargetLang] =
    useState<Language>(DEFAULT_TARGET_LANG);
  const [newMediumLang, setNewMediumLang] = useState<Language | null>(null); // Optional
  const [newAccent, setNewAccent] = useState("American");

  // Picker Modals
  const [pickerType, setPickerType] = useState<
    "native" | "target" | "medium" | null
  >(null);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const handlePlayAccent = () => {
    setIsPlaying(true);
    // Placeholder for actual TTS
    setTimeout(() => setIsPlaying(false), 2000);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Play Sound",
      `Speaking "${testPhrase}" with ${
        activeProfile?.preferred_accent || "American"
      } accent at ${speechRate.toFixed(1)}x speed`
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
      Alert.alert("Error", "Failed to create profile. Please try again.");
    }
  };

  const handleDeleteProfile = (id: string) => {
    Alert.alert(
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
      ]
    );
  };

  const handleSwitchProfile = async (id: string) => {
    if (activeProfile?.id === id) return;
    Haptics.selectionAsync();
    await switchProfile(id);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={["top"]}>
      <View className="px-6 py-4 mb-2 flex-row justify-center items-center relative">
        <View className="items-center">
          <Text className="text-black text-2xl font-bold">Sophie AI</Text>
          <Text className="text-gray-500 text-base font-medium">
            Native speaker in your pocket
          </Text>
        </View>
        <Link href="/profile" asChild>
          <TouchableOpacity className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 absolute left-6">
            {user?.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: user.user_metadata.avatar_url }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-blue-50">
                <Text className="text-blue-500 font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Link>
      </View>
      <View className="px-6 mb-6">
        <Text className="text-4xl font-bold text-black text-left">
          Language Environment
        </Text>
        <Text className="text-gray-500 text-lg font-medium mt-1 text-left">
          Choose your native & target languages and preferred accent to
          customize your learning experience.
        </Text>
      </View>

      <ScrollView className="flex-1 " showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-24">
          {/* Active Profile Card */}
          {activeProfile ? (
            <View className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm shadow-gray-100 mb-6">
              <View className="flex-row items-center gap-2 mb-4">
                <Globe size={20} color="#3b82f6" />
                <Text className="text-xs font-black text-blue-500 uppercase tracking-widest">
                  Current Learning Profile
                </Text>
              </View>

              {/* Preference Items */}
              <View className="space-y-4">
                {/* Native/Medium Language */}
                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                    I speak (Instruction Language)
                  </Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {activeProfile.medium_language ||
                      activeProfile.native_language}
                  </Text>
                </View>

                {/* Target Language */}
                <View className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex-row justify-between items-center">
                  <View>
                    <Text className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      I want to learn
                    </Text>
                    <Text className="text-xl font-bold text-blue-900">
                      {activeProfile.target_language}
                    </Text>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                    <ArrowRightLeft size={14} color="#3b82f6" />
                  </View>
                </View>

                {/* Accent */}
                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row justify-between items-center">
                  <View>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                      Preferred Accent
                    </Text>
                    <Text className="text-lg font-bold text-gray-900">
                      {activeProfile.preferred_accent || "Standard"}
                    </Text>
                  </View>
                  <Volume2 size={18} color="#64748b" />
                </View>
              </View>
            </View>
          ) : (
            <View className="items-center justify-center p-8 bg-gray-50 rounded-[32px] mb-6 border border-dashed border-gray-200">
              <Text className="text-gray-400 font-medium text-center">
                No active profile selected.
              </Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(true)}>
                <Text className="text-blue-500 font-bold mt-2">
                  Create Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Accent Playground */}
          <View className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm shadow-gray-100 mb-8">
            <Text className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">
              Accent Playground
            </Text>

            <TextInput
              value={testPhrase}
              onChangeText={setTestPhrase}
              className="bg-gray-50 p-4 rounded-2xl text-base text-gray-900 font-medium border border-gray-100 mb-4"
            />

            {/* Waveform Placeholder */}
            <View className="h-8 flex-row items-center justify-center gap-1 mb-6 opacity-30">
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  className="w-1 bg-gray-900 rounded-full"
                  style={{ height: Math.random() * 20 + 4 }}
                />
              ))}
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-900 mb-3">
                  Speed
                </Text>
                <View className="flex-row gap-2 flex-wrap">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      onPress={() => setSpeechRate(rate)}
                      className={`px-3 py-2 rounded-xl border ${
                        speechRate === rate
                          ? "bg-blue-500 border-blue-500"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-bold text-sm ${
                          speechRate === rate ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {rate}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handlePlayAccent}
                className="ml-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-200"
              >
                {isPlaying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Play size={24} color="white" fill="white" />
                )}
              </TouchableOpacity>
            </View>

            <Text className="text-center text-gray-400 text-xs mt-6 px-4 leading-relaxed">
              Test selected accent and adjust speaking speed. Tap Play to
              preview.
            </Text>

            {activeProfile && (
              <TouchableOpacity className="mt-6 bg-blue-500 py-4 rounded-2xl items-center shadow-sm shadow-blue-200">
                <Text className="text-white font-bold text-base">
                  Save Changes
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Profiles List (Folders) */}
          <Text className="text-2xl font-bold text-gray-900 tracking-tight mb-4">
            My Profiles
          </Text>
          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              onPress={() => handleSwitchProfile(profile.id)}
              className={`mb-4 p-5 rounded-3xl border flex-row items-center justify-between ${
                profile.is_active
                  ? "bg-gray-900 border-gray-900"
                  : "bg-white border-gray-100 shadow-sm shadow-gray-50"
              }`}
            >
              <View className="flex-row items-center gap-4">
                <View
                  className={`w-12 h-12 rounded-2xl items-center justify-center ${
                    profile.is_active ? "bg-gray-800" : "bg-blue-50"
                  }`}
                >
                  <Folder
                    size={24}
                    color={profile.is_active ? "#ffffff" : "#3b82f6"}
                    strokeWidth={2}
                  />
                </View>
                <View>
                  <Text
                    className={`text-lg font-bold ${
                      profile.is_active ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {profile.name}
                  </Text>
                  <Text
                    className={`text-xs font-medium ${
                      profile.is_active ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {profile.native_language} → {profile.target_language}
                  </Text>
                </View>
              </View>

              {profile.is_active ? (
                <View className="w-8 h-8 rounded-full bg-green-500 items-center justify-center">
                  <CheckCircle2 size={16} color="white" />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handleDeleteProfile(profile.id)}
                  className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => setIsCreateModalVisible(true)}
            className="p-5 rounded-3xl border border-dashed border-gray-300 flex-row items-center justify-center gap-2 mt-2 bg-gray-50"
          >
            <Plus size={20} color="#94a3b8" />
            <Text className="text-gray-400 font-bold text-base">
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
        <View className="flex-1 bg-white">
          <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-50">
            <Text className="text-xl font-bold text-gray-900">
              New Learning Profile
            </Text>
            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
              <Text className="text-blue-500 font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-6">
            {/* Native Language */}
            <View className="mb-6">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                Native Language
              </Text>
              <TouchableOpacity
                onPress={() => setPickerType("native")}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row items-center justify-between"
              >
                <Text className="text-lg font-bold text-gray-900">
                  {newNativeLang.name}
                </Text>
                <Text className="text-2xl">{newNativeLang.flag}</Text>
              </TouchableOpacity>
            </View>

            {/* Medium Language */}
            <View className="mb-6">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                Instruction Language (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => setPickerType("medium")}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row items-center justify-between"
              >
                <Text className="text-lg font-bold text-gray-900">
                  {newMediumLang?.name || "Same as Native"}
                </Text>
                {newMediumLang && (
                  <Text className="text-2xl">{newMediumLang.flag}</Text>
                )}
              </TouchableOpacity>
            </View>

            <View className="h-[1px] bg-gray-100 w-full mb-6" />

            {/* Target Language */}
            <View className="mb-6">
              <Text className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                I want to learn
              </Text>
              <TouchableOpacity
                onPress={() => setPickerType("target")}
                className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex-row items-center justify-between"
              >
                <Text className="text-lg font-bold text-blue-900">
                  {newTargetLang.name}
                </Text>
                <Text className="text-2xl">{newTargetLang.flag}</Text>
              </TouchableOpacity>
            </View>

            {/* Accent */}
            <View className="mb-8">
              <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">
                Preferred Accent
              </Text>
              <View className="flex-row gap-3 flex-wrap">
                {["American", "British", "Indian", "Australian"].map(
                  (accent) => (
                    <TouchableOpacity
                      key={accent}
                      onPress={() => setNewAccent(accent)}
                      className={`px-4 py-3 rounded-xl border ${
                        newAccent === accent
                          ? "bg-gray-900 border-gray-900"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`font-bold ${
                          newAccent === accent ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {accent}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreateProfile}
              className="w-full h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-200"
            >
              <Text className="text-white font-bold text-lg">
                Create Profile
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Reusing Language Picker */}
        <LanguagePickerModal
          visible={pickerType !== null}
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
      </Modal>
    </SafeAreaView>
  );
}
