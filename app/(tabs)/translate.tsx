import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import CircleFlag from "@/components/common/CircleFlag";
import { PageHeader } from "@/components/common/PageHeader";
import { RainbowBorder } from "@/components/common/Rainbow";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import { TranslationHistory } from "@/components/translate/TranslationHistory";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
  Language,
} from "@/constants/languages";
import { useTranslation } from "@/hooks/useTranslation";
import { speakWord, stopSpeaking } from "@/services/audio/tts";
import { translateText } from "@/services/gemini/translate";
// import { geminiWebSocket } from "@/services/gemini/websocket"; // Removed
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import {
  TranslationHistoryItem,
  useTranslationHistoryStore,
} from "@/stores/translationHistoryStore";
import { useVocabularyStore } from "@/stores/vocabularyStore";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import {
  ArrowRightLeft,
  Bookmark,
  ChevronDown,
  Copy,
  Folder,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react-native";
import React, { useState } from "react";
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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TranslateScreen() {
  useAuthStore(); // Kept for auth state side effects
  const { activeProfile } = useProfileStore();
  const { setPracticePhrase } = useScenarioStore();
  const router = useRouter();
  const { addEntry } = useTranslationHistoryStore();
  const { addItem, addFolder, folders, fetchVocabulary } = useVocabularyStore();
  const { t } = useTranslation();

  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [romanization, setRomanization] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [sourceLang, setSourceLang] = useState<Language>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<Language>(DEFAULT_TARGET_LANG);

  // Modal states
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showSaveFolderPicker, setShowSaveFolderPicker] = useState(false);
  const [saveFolderId, setSaveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Custom AlertModal hook
  const { alertState, showAlert, hideAlert } = useAlertModal();

  // Animation for swap button - horizontal flip
  const flipX = useSharedValue(1);

  // Speech Recognition Events
  useSpeechRecognitionEvent("start", () => setIsListening(true));
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("result", (event) => {
    if (event.results[0]?.transcript) {
      setInputText(event.results[0].transcript);
      // Clear translation when new speech input comes in
      if (translatedText) {
        setTranslatedText("");
        setRomanization("");
      }
    }
  });
  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      showAlert(
        t("translate_screen.alerts.permission_required"),
        t("translate_screen.alerts.mic_access"),
        undefined,
        "error",
      );
    } else {
      showAlert(
        t("translate_screen.alerts.error"),
        t("translate_screen.alerts.translate_failed"),
        undefined,
        "error",
      );
    }
  });

  const handleMicPress = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      Haptics.selectionAsync();
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) {
        showAlert(
          t("translate_screen.alerts.permission_required"),
          t("translate_screen.alerts.mic_access"),
          undefined,
          "error",
        );
        return;
      }

      // Construct locale code (e.g., "en-US", "hi-IN")
      const locale = `${sourceLang.code}-${sourceLang.countryCode.toUpperCase()}`;

      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: true,
        iosCategory: {
          category: "playAndRecord",
          categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
          mode: "default",
        },
      });
    }
  };

  const handleSwap = () => {
    Haptics.selectionAsync();

    // Animate horizontal flip - smooth
    flipX.value = withTiming(flipX.value * -1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });

    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);

    // If there's already a translation, swap the texts too
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText(inputText);
      setRomanization("");
    }
  };

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flipX.value }],
  }));

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setIsTranslating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await translateText(
        inputText,
        targetLang.name,
        sourceLang.name,
      );
      setTranslatedText(result.translation);
      setRomanization(result.romanization);

      // Save to history
      addEntry({
        sourceText: inputText,
        translatedText: result.translation,
        romanization: result.romanization,
        sourceLang: sourceLang.code,
        targetLang: targetLang.code,
      });
    } catch (error) {
      console.error("Translation error:", error);
      showAlert(
        t("translate_screen.alerts.error"),
        t("translate_screen.alerts.translate_failed"),
        undefined,
        "error",
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveClick = () => {
    if (!translatedText) return;
    // Fetch folders and show picker
    fetchVocabulary();
    setShowSaveFolderPicker(true);
  };

  const handleSaveWithFolder = async () => {
    if (!translatedText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const success = await addItem({
      phrase: translatedText,
      translation: inputText,
      context: `${sourceLang.name} → ${targetLang.name}`,
      language: targetLang.name,
      folder_id: saveFolderId,
    });

    if (success) {
      setShowSaveFolderPicker(false);
      setSaveFolderId(null);
      showAlert(
        t("translate_screen.alerts.saved_title"),
        t("translate_screen.alerts.saved_message"),
        undefined,
        "success",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      showAlert(
        t("translate_screen.alerts.error"),
        t("translate_screen.alerts.save_failed"),
        undefined,
        "error",
      );
    }
  };

  const handlePractice = () => {
    if (!translatedText) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPracticePhrase(translatedText);
    router.push("/(tabs)/talk");
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert(
      t("translate_screen.alerts.copied_title"),
      t("translate_screen.alerts.copied_message"),
      undefined,
      "success",
    );
  };

  const clearAll = () => {
    setInputText("");
    setTranslatedText("");
    setRomanization("");
    Haptics.selectionAsync();
  };

  const handleHistorySelect = (item: TranslationHistoryItem) => {
    setInputText(item.sourceText);
    setTranslatedText(item.translatedText);
    setRomanization(item.romanization);
    // Note: We don't automatically switch languages to match history item
    // because that might be confusing if user just wants to see the result
  };

  /**
   * Speak the translated text using native device TTS (expo-speech).
   */
  const handleSpeak = async () => {
    if (!translatedText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If already speaking, stop playback
    if (isSpeaking) {
      await stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    // Use built-in TTS instead of Gemini WebSocket
    await speakWord(translatedText, targetLang.name, {
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onError: (err) => {
        setIsSpeaking(false);
        console.error("TTS Error:", err);
      },
    }, 1.0, activeProfile?.preferred_accent);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      <View className="px-4 mb-4">
        <Text className="text-xl font-bold text-black text-left">
          {t("translate_screen.title")}
        </Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          {t("translate_screen.subtitle")}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4">
            {/* Language Selector Bar - Restored floating design */}
            <View className="bg-surface rounded-full shadow-lg">
              <View className="flex-row items-center justify-between p-4">
                {/* Source Language */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowSourcePicker(true)}
                  className="flex-1 flex-row items-center gap-1"
                >
                  <View className="flex-row items-center gap-2">
                    <CircleFlag
                      countryCode={sourceLang.countryCode}
                      size={28}
                    />
                    <Text className="text-gray-900 font-semibold text-base">
                      {sourceLang.name}
                    </Text>
                  </View>
                  <ChevronDown size={16} color="#111827" />
                </TouchableOpacity>

                {/* Swap Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSwap}
                  className="mx-4"
                >
                  <RainbowBorder
                    borderRadius={9999}
                    borderWidth={2}
                    containerClassName="size-10 items-center justify-center"
                  >
                    <Animated.View style={animatedIconStyle}>
                      <ArrowRightLeft size={18} color="black" />
                    </Animated.View>
                  </RainbowBorder>
                </TouchableOpacity>

                {/* Target Language */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowTargetPicker(true)}
                  className="flex-1 flex-row items-center justify-end gap-1"
                >
                  <ChevronDown size={16} color="#111827" className="mr-1" />
                  <View className="flex-row items-center gap-2">
                    <Text className="text-gray-900 font-semibold text-base">
                      {targetLang.name}
                    </Text>
                    <CircleFlag
                      countryCode={targetLang.countryCode}
                      size={28}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-3 mb-6">
              <Text className="text-gray-400 text-base text-center">
                {t("translate_screen.swap_instruction")}
              </Text>
            </View>
          </View>

          {/* Top Section - Input Area (Clean Split) */}
          <View className="px-4">
            <View className="min-h-[140px]">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-2 h-2 rounded-full bg-gray-400" />
                <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {sourceLang.name}
                </Text>
              </View>
              <TextInput
                placeholder={t("translate_screen.input_placeholder")}
                multiline
                className="text-gray-900 text-sm leading-normal"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (!text) {
                    setTranslatedText("");
                    setRomanization("");
                  }
                }}
                placeholderTextColor="gray"
                scrollEnabled={false}
              />
            </View>

            {/* Input Actions row */}
            <View className="flex-row items-center justify-between mt-6">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleMicPress}
                  className={`w-10 h-10 items-center justify-center rounded-full ${isListening ? "bg-red-100" : "bg-gray-100"
                    }`}
                >
                  <FontAwesome
                    name="microphone"
                    size={18}
                    color={isListening ? "#ef4444" : "black"}
                  />
                </TouchableOpacity>
                {inputText.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={clearAll}
                    className="w-10 h-10 items-center justify-center rounded-full bg-red-100 "
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleTranslate}
                disabled={isTranslating || !inputText.trim()}
                className="rounded-full overflow-hidden"
              >
                {isTranslating || !inputText.trim() ? (
                  <View className="px-5 py-4 bg-gray-200 flex-row items-center gap-2">
                    {isTranslating ? (
                      <ActivityIndicator color="#9ca3af" size="small" />
                    ) : (
                      <>
                        <Sparkles size={18} color="#9ca3af" />
                        <Text className="font-bold text-gray-400">
                          {t("translate_screen.actions.translate")}
                        </Text>
                      </>
                    )}
                  </View>
                ) : (
                  <RainbowBorder
                    borderRadius={999}
                    borderWidth={2}
                    containerClassName="flex-row items-center gap-2 px-5 py-4"
                    className="bg-white"
                  >
                    <Sparkles size={18} color="black" />
                    <Text className="font-bold text-black">
                      {t("translate_screen.actions.translate")}
                    </Text>
                  </RainbowBorder>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Section - Output Area (Clean Split) */}
          <View
            className="flex-1 bg-white rounded-t-3xl mt-6 p-4 overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            {translatedText ? (
              <>
                <View className="min-h-[140px]">
                  <View className="flex-row items-center gap-2 mb-3">
                    <View className="w-2 h-2 rounded-full bg-gray-400" />
                    <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                      {targetLang.name}
                    </Text>
                  </View>
                  <Text className="text-gray-900 text-sm leading-normal">
                    {translatedText}
                  </Text>
                  {romanization ? (
                    <Text className="text-gray-500 text-sm italic mt-1 font-medium">
                      {romanization}
                    </Text>
                  ) : null}

                  {/* Actions Row */}
                  <View className="mt-8 flex-row items-center justify-between">
                    {/* Icon Buttons */}
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => copyToClipboard(translatedText)}
                        className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                      >
                        <Copy size={18} color="#374151" />
                      </TouchableOpacity>
                      {/* Text to speech */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleSpeak}
                        className={`w-10 h-10 rounded-full items-center justify-center ${isSpeaking ? "bg-blue-100" : "bg-gray-100"
                          }`}
                      >
                        <Volume2
                          size={18}
                          color={isSpeaking ? "#3b82f6" : "#374151"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleSaveClick}
                        className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                      >
                        <Bookmark size={18} color="#374151" />
                      </TouchableOpacity>
                    </View>

                    {/* Primary Action */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handlePractice}
                    >
                      <RainbowBorder
                        borderRadius={999}
                        borderWidth={2}
                        containerClassName="px-5 py-4 flex-row items-center gap-2"
                      >
                        <MessageSquare size={16} color="black" />
                        <Text className="font-bold text-black">
                          {t("translate_screen.actions.practice")}
                        </Text>
                      </RainbowBorder>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center gap-4 py-10">
                <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center">
                  <MessageSquare size={28} color="#9ca3af" />
                </View>
                <Text className="text-gray-400 text-lg text-center font-medium italic">
                  {t("translate_screen.empty_state")}
                </Text>
              </View>
            )}

            {/* Translation History */}
            <TranslationHistory onSelect={handleHistorySelect} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Picker Modals */}
      <LanguagePickerModal
        visible={showSourcePicker}
        onClose={() => setShowSourcePicker(false)}
        onSelect={setSourceLang}
        selectedCode={sourceLang.code}
        title={t("translate_screen.modals.source_picker_title")}
      />

      <LanguagePickerModal
        visible={showTargetPicker}
        onClose={() => setShowTargetPicker(false)}
        onSelect={setTargetLang}
        selectedCode={targetLang.code}
        title={t("translate_screen.modals.target_picker_title")}
      />

      {/* Save Folder Picker Modal */}
      <Modal
        visible={showSaveFolderPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSaveFolderPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-black">
              {t("translate_screen.modals.save_folder_title")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowSaveFolderPicker(false)}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <View className="px-4 py-4">
              {/* Create New Folder Input */}
              {isCreatingFolder ? (
                <View className="flex-row items-center gap-2 mb-4">
                  <TextInput
                    className="flex-1 bg-gray-50 py-3 px-4 text-sm rounded-full border border-gray-100 font-medium text-gray-900"
                    placeholder={t(
                      "translate_screen.modals.folder_name_placeholder",
                    )}
                    placeholderTextColor="gray"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    style={{ includeFontPadding: false }}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="h-12 rounded-full overflow-hidden"
                    onPress={async () => {
                      if (!newFolderName.trim()) return;
                      const newFolder = await addFolder(newFolderName);
                      if (newFolder) {
                        setSaveFolderId(newFolder.id);
                        setIsCreatingFolder(false);
                        setNewFolderName("");
                      } else {
                        showAlert(
                          t("translate_screen.alerts.error"),
                          t("translate_screen.alerts.save_failed"),
                          undefined,
                          "error",
                        );
                      }
                    }}
                  >
                    <RainbowBorder
                      borderRadius={9999}
                      borderWidth={2}
                      className="flex-1"
                      containerClassName="flex-row items-center justify-center px-4 gap-2"
                    >
                      <Plus size={20} color="black" />
                      <Text className="text-black font-bold text-base">
                        {t("translate_screen.modals.create_button")}
                      </Text>
                    </RainbowBorder>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center gap-3 py-3 px-2 mb-2"
                  onPress={() => setIsCreatingFolder(true)}
                >
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <Plus size={20} color="black" />
                  </View>
                  <Text className="text-black font-bold text-base">
                    {t("translate_screen.modals.create_new_folder")}
                  </Text>
                </TouchableOpacity>
              )}

              <Text className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-4 mt-2">
                {t("translate_screen.modals.your_folders")}
              </Text>
            </View>

            <ScrollView
              className="flex-1 px-4"
              showsVerticalScrollIndicator={false}
            >
              {folders.map((folder) => {
                const isSelected = saveFolderId === folder.id;
                const Content = () => (
                  <>
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                      <Folder size={20} color="gray" />
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="font-bold text-base text-gray-900">
                        {folder.name}
                      </Text>
                    </View>
                  </>
                );

                return (
                  <TouchableOpacity
                    key={folder.id}
                    onPress={() => setSaveFolderId(folder.id)}
                    className="mb-3"
                    activeOpacity={0.7}
                  >
                    {isSelected ? (
                      <RainbowBorder
                        borderRadius={20}
                        borderWidth={2}
                        containerClassName="flex-row items-center px-4 py-4"
                        className="bg-white"
                      >
                        <Content />
                      </RainbowBorder>
                    ) : (
                      <View
                        style={{
                          borderWidth: 1.5,
                          borderRadius: 20,
                          padding: 16,
                        }}
                        className="flex-row items-center border-gray-200 bg-white"
                      >
                        <Content />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {folders.length === 0 && (
                <Text className="text-gray-400 text-center mt-10 italic">
                  {t("translate_screen.modals.no_folders")}
                </Text>
              )}
              <View className="h-20" />
            </ScrollView>
          </View>

          {/* Save Button */}
          <View className="px-6 py-8 border-t border-gray-100">
            <TouchableOpacity
              onPress={handleSaveWithFolder}
              activeOpacity={0.7}
              className="w-full h-16 rounded-full overflow-hidden shadow-lg"
            >
              <RainbowBorder
                borderWidth={2}
                borderRadius={9999}
                className="flex-1"
                containerClassName="items-center justify-center"
              >
                <Text className="text-black font-bold text-base">
                  {t("translate_screen.modals.save_to_vocab_button")}
                </Text>
              </RainbowBorder>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom AlertModal for Copy/Save feedback */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </SafeAreaView>
  );
}
