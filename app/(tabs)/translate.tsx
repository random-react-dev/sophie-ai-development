import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import CircleFlag from "@/components/common/CircleFlag";
import { PageHeader } from "@/components/common/PageHeader";
import { RainbowBorder } from "@/components/common/Rainbow";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
  Language,
} from "@/constants/languages";
import { translateText } from "@/services/gemini/translate";
import { saveToVocabulary } from "@/services/supabase/vocabulary";
import { useAuthStore } from "@/stores/authStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { FontAwesome } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  ArrowRightLeft,
  Bookmark,
  ChevronDown,
  Copy,
  MessageSquare,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
  const { user } = useAuthStore();
  const { setPracticePhrase } = useScenarioStore();
  const router = useRouter();

  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const [sourceLang, setSourceLang] = useState<Language>(DEFAULT_SOURCE_LANG);
  const [targetLang, setTargetLang] = useState<Language>(DEFAULT_TARGET_LANG);

  // Modal states
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  // Custom AlertModal hook
  const { alertState, showAlert, hideAlert } = useAlertModal();

  // Animation for swap button - horizontal flip
  const flipX = useSharedValue(1);

  const handleSwap = useCallback(() => {
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
    }
  }, [sourceLang, targetLang, inputText, translatedText, flipX]);

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
      setTranslatedText(result);
    } catch (error) {
      console.error("Translation error:", error);
      showAlert(
        "Error",
        "Failed to translate. Please try again.",
        undefined,
        "error",
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!translatedText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const success = await saveToVocabulary({
      phrase: inputText,
      translation: translatedText,
      context: `${sourceLang.name} → ${targetLang.name}`,
    });

    if (success) {
      showAlert("Saved!", "Added to your vocabulary", undefined, "success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      showAlert(
        "Error",
        "Failed to save. Please try again.",
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
    showAlert("Copied", "Text copied to clipboard", undefined, "success");
  };

  const clearAll = () => {
    setInputText("");
    setTranslatedText("");
    Haptics.selectionAsync();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      <View className="px-4 mb-8">
        <Text className="text-3xl font-bold text-black text-left">
          Translation
        </Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          Translate text to another language
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
                Tap swap to reverse direction
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
                placeholder="Enter text to translate..."
                multiline
                className="text-gray-900 text-xl leading-normal"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (!text) setTranslatedText("");
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
                  className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                >
                  <FontAwesome name="microphone" size={18} color="black" />
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
                          Translate
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
                    <Text className="font-bold text-black">Translate</Text>
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
                  <Text className="text-gray-900 text-xl leading-normal">
                    {translatedText}
                  </Text>

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
                      <TouchableOpacity
                        activeOpacity={0.7}
                        className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                      >
                        <Volume2 size={18} color="#374151" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleSave}
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
                        <Text className="font-bold text-black">Practice</Text>
                      </RainbowBorder>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center gap-4">
                <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center">
                  <MessageSquare size={28} color="#9ca3af" />
                </View>
                <Text className="text-gray-400 text-lg text-center font-medium italic">
                  Translation will appear here...
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Picker Modals */}
      <LanguagePickerModal
        visible={showSourcePicker}
        onClose={() => setShowSourcePicker(false)}
        onSelect={setSourceLang}
        selectedCode={sourceLang.code}
        title="Translate from"
      />

      <LanguagePickerModal
        visible={showTargetPicker}
        onClose={() => setShowTargetPicker(false)}
        onSelect={setTargetLang}
        selectedCode={targetLang.code}
        title="Translate to"
      />

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
