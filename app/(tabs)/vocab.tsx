import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import { DEFAULT_TARGET_LANG, Language } from "@/constants/languages";
import { translateText } from "@/services/gemini/translate";
import {
  deleteFromVocabulary,
  getVocabulary,
  saveToVocabulary,
  VocabularyItem,
} from "@/services/supabase/vocabulary";
import { useAuthStore } from "@/stores/authStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  BookOpen,
  Languages,
  MessageSquare,
  MoreVertical,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

export default function VocabScreen() {
  const { user } = useAuthStore();
  const { setPracticePhrase } = useScenarioStore();
  const router = useRouter();
  const { alertState, showAlert, hideAlert } = useAlertModal();

  // Data
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

  // Add Phrase Modal
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newPhrase, setNewPhrase] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newLanguage, setNewLanguage] = useState<Language>(DEFAULT_TARGET_LANG);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Multi-select Modal
  const [isMultiSelectVisible, setIsMultiSelectVisible] = useState(false);
  const [selectedForPractice, setSelectedForPractice] = useState<Set<string>>(
    new Set()
  );
  const [primaryPracticeItem, setPrimaryPracticeItem] =
    useState<VocabularyItem | null>(null);

  // Action Modal
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [selectedActionItem, setSelectedActionItem] =
    useState<VocabularyItem | null>(null);

  const fetchVocab = async () => {
    try {
      const data = await getVocabulary();
      setItems(data);
    } catch (error) {
      console.error("Error fetching vocab:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVocab();
  }, []);

  const languages = useMemo(() => {
    const langs = new Set(items.map((i) => i.language).filter(Boolean));
    return ["All", ...Array.from(langs)] as string[];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.translation &&
          item.translation.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLang =
        selectedLanguage === "All" || item.language === selectedLanguage;
      return matchesSearch && matchesLang;
    });
  }, [items, searchQuery, selectedLanguage]);

  const handlePlay = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAlert("Listen", `Playing audio for: "${text}"`, undefined, "info");
  };

  const handleDelete = async (id: string) => {
    showAlert(
      "Delete Phrase",
      "Are you sure you want to delete this phrase?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteFromVocabulary(id);
            if (success) {
              setItems((prev) => prev.filter((i) => i.id !== id));
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } else {
              showAlert("Error", "Failed to delete item", undefined, "error");
            }
          },
        },
      ],
      "warning"
    );
  };

  const handleTranslateItem = async (item: VocabularyItem) => {
    if (item.translation) {
      showAlert("Translation", item.translation, undefined, "info");
      return;
    }

    try {
      // Defaulting target to English if unknown, or infer from context
      const translated = await translateText(item.phrase, "English");

      // Ask to save the translation
      showAlert(
        "Translation",
        translated,
        [
          { text: "Close", style: "cancel" },
          {
            text: "Save Translation",
            onPress: async () => {
              // Ideally update the item, but for now just show it
            },
          },
        ],
        "success"
      );
    } catch {
      showAlert("Error", "Translation failed", undefined, "error");
    }
  };

  const initPractice = (item: VocabularyItem) => {
    setPrimaryPracticeItem(item);
    setSelectedForPractice(new Set([item.phrase]));
    setIsMultiSelectVisible(true);
  };

  const startPracticeSession = () => {
    const phrases = Array.from(selectedForPractice);
    const combinedPrompt = phrases.join(". ");

    setPracticePhrase(combinedPrompt);
    setIsMultiSelectVisible(false);
    router.push("/(tabs)/talk");
  };

  const showActionMenu = (item: VocabularyItem) => {
    setSelectedActionItem(item);
    setIsActionModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeActionModal = () => {
    setIsActionModalVisible(false);
    setSelectedActionItem(null);
  };

  const handleActionPress = (
    action: "play" | "translate" | "conversation" | "delete"
  ) => {
    if (!selectedActionItem) return;
    closeActionModal();

    switch (action) {
      case "play":
        handlePlay(selectedActionItem.phrase);
        break;
      case "translate":
        handleTranslateItem(selectedActionItem);
        break;
      case "conversation":
        initPractice(selectedActionItem);
        break;
      case "delete":
        if (selectedActionItem.id) handleDelete(selectedActionItem.id);
        break;
    }
  };

  const handleAddItem = async () => {
    if (!newPhrase.trim()) {
      showAlert("Required", "Please enter a phrase", undefined, "error");
      return;
    }

    const success = await saveToVocabulary({
      phrase: newPhrase,
      translation: newTranslation,
      language: newLanguage.name,
      context: "Manual Entry",
    });

    if (success) {
      setNewPhrase("");
      setNewTranslation("");
      setIsAddModalVisible(false);
      fetchVocab();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      showAlert("Error", "Failed to save phrase", undefined, "error");
    }
  };

  const togglePracticeSelection = (phrase: string) => {
    const next = new Set(selectedForPractice);
    if (next.has(phrase)) {
      next.delete(phrase);
    } else {
      next.add(phrase);
    }
    setSelectedForPractice(next);
    Haptics.selectionAsync();
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchVocab();
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

      <View className="px-6 mb-8">
        <Text className="text-3xl font-bold text-black text-left">Vocab</Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          Your saved words & phrases
        </Text>
      </View>

      {/* Search and Add */}
      <View className="px-6 flex-row gap-2 mb-6">
        <View className="flex-1 h-12 bg-white shadow-lg rounded-full flex-row items-center px-4">
          {/* <Search size={20} color="gray" /> */}
          <Feather name="search" size={20} color="gray" />
          <TextInput
            placeholder="Search saved words..."
            className="flex-1 ml-3 text-gray-900 font-medium"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="gray"
          />
        </View>
        <TouchableOpacity
          onPress={() => setIsAddModalVisible(true)}
          className="h-12 px-4 bg-blue-500 rounded-full flex-row items-center gap-2"
        >
          <Plus size={20} color="white" />
          <Text className="text-white font-bold text-base">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Language Filter Chips */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang}
              activeOpacity={0.7}
              onPress={() => setSelectedLanguage(lang)}
              className={`px-5 py-2 rounded-full border ${
                selectedLanguage === lang
                  ? "bg-blue-100 border-blue-300"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`font-bold text-[13px] ${
                  selectedLanguage === lang ? "text-blue-500" : "text-gray-600"
                }`}
              >
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading && !isRefreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              className="mb-4 p-4 rounded-2xl shadow-lg flex-row items-center bg-white"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    {item.language && (
                      <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        {item.language}
                      </Text>
                    )}
                  </View>
                  <Text className="text-lg font-bold text-gray-900 leading-snug">
                    {item.phrase}
                  </Text>
                  {item.translation && (
                    <Text className="text-gray-500 font-medium italic mt-1">
                      &quot;{item.translation}&quot;
                    </Text>
                  )}
                </View>

                <View className="flex-row items-center gap-3">
                  {/* Mic Icon */}
                  <TouchableOpacity
                    onPress={() => handlePlay(item.phrase)}
                    className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center"
                  >
                    <FontAwesome name="microphone" size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => showActionMenu(item)}
                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <MoreVertical size={14} color="black" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center mt-20 opacity-40">
              <BookOpen size={60} color="#94a3b8" />
              <Text className="text-gray-500 font-bold mt-4 text-center px-10">
                {searchQuery
                  ? "No matches found"
                  : "Your vocabulary is empty.\nAdd phrases to start learning!"}
              </Text>
            </View>
          }
        />
      )}

      {/* Add Phrase Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-white"
        >
          <SafeAreaView className="flex-1">
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
              <Text className="text-2xl font-bold text-black">Add Phrase</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-6 pt-6"
              showsVerticalScrollIndicator={false}
            >
              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Language
                </Text>
                <TouchableOpacity
                  onPress={() => setShowLangPicker(true)}
                  className="flex-row items-center bg-gray-50 px-4 py-4 rounded-full border border-gray-100"
                >
                  <Text className="text-2xl mr-3">{newLanguage.flag}</Text>
                  <Text className="text-lg font-semibold text-gray-900 flex-1">
                    {newLanguage.name}
                  </Text>
                  <Text className="text-blue-500 font-bold text-sm">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Phrase <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100 font-medium"
                  placeholder="Enter word or phrase..."
                  placeholderTextColor="gray"
                  value={newPhrase}
                  onChangeText={setNewPhrase}
                  multiline
                />
              </View>

              <View className="mb-10">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Translation (Optional)
                </Text>
                <TextInput
                  className="bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100 font-medium h-32 text-start align-top"
                  placeholder="Enter meaning..."
                  placeholderTextColor="gray"
                  value={newTranslation}
                  onChangeText={setNewTranslation}
                  multiline
                />
              </View>
            </ScrollView>

            <View className="px-6 py-8 border-t border-gray-100">
              <TouchableOpacity
                onPress={handleAddItem}
                className={`w-full h-16 rounded-full items-center justify-center shadow-lg ${
                  !newPhrase.trim() ? "bg-gray-200" : "bg-blue-500"
                }`}
                disabled={!newPhrase.trim()}
              >
                <Text className="text-white font-bold text-lg">
                  Save Phrase
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <LanguagePickerModal
        visible={showLangPicker}
        onClose={() => setShowLangPicker(false)}
        onSelect={(lang) => {
          setNewLanguage(lang);
          setShowLangPicker(false);
        }}
        selectedCode={newLanguage.code}
      />

      {/* Multi-Phrase Selection Modal */}
      <Modal
        visible={isMultiSelectVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="px-6 py-6 bg-white border-b border-gray-100">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-gray-900">
                  Practice Session
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMultiSelectVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Phrase List */}
          <FlatList
            data={filteredItems}
            extraData={selectedForPractice}
            keyExtractor={(item) => item.id || item.phrase}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <SelectablePhraseItem
                item={item}
                isActive={selectedForPractice.has(item.phrase)}
                isPrimary={item.id === primaryPracticeItem?.id}
                onPress={() => togglePracticeSelection(item.phrase)}
              />
            )}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-400 font-medium text-base">
                  No phrases available
                </Text>
              </View>
            }
          />

          {/* Bottom CTA */}
          <View className="absolute bottom-0 left-0 right-0 px-6 pt-4 pb-10 bg-white border-t border-gray-100 shadow-2xl">
            <TouchableOpacity
              onPress={startPracticeSession}
              disabled={selectedForPractice.size === 0}
              activeOpacity={0.8}
              className={`h-16 rounded-full items-center justify-center flex-row gap-3 shadow-lg shadow-blue-200 ${
                selectedForPractice.size > 0 ? "bg-blue-500" : "bg-gray-200"
              }`}
            >
              <MessageSquare
                size={22}
                color={selectedForPractice.size > 0 ? "white" : "#9ca3af"}
              />
              <Text
                className={`font-bold text-lg ${
                  selectedForPractice.size > 0 ? "text-white" : "text-gray-400"
                }`}
              >
                Start with {selectedForPractice.size} Phrase
                {selectedForPractice.size === 1 ? "" : "s"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Action Modal with Swipe to Dismiss */}
      <Modal
        visible={isActionModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeActionModal}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ActionModalContent
            selectedItem={selectedActionItem}
            onClose={closeActionModal}
            onAction={handleActionPress}
          />
        </GestureHandlerRootView>
      </Modal>

      {/* Alert Modal */}
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

// Separate component for the draggable modal content
function ActionModalContent({
  selectedItem,
  onClose,
  onAction,
}: {
  selectedItem: VocabularyItem | null;
  onClose: () => void;
  onAction: (action: "play" | "translate" | "conversation" | "delete") => void;
}) {
  const translateY = useSharedValue(0);
  const context = useSharedValue(0);
  const DISMISS_THRESHOLD = 80;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      // Only allow dragging down (positive Y)
      const newValue = context.value + event.translationY;
      translateY.value = Math.max(0, newValue);
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 500) {
        // Dismiss the modal with animation
        translateY.value = withTiming(500, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(handleClose)();
          }
        });
      } else {
        // Snap back to original position
        translateY.value = withSpring(0, { damping: 25, stiffness: 400 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - translateY.value / 400,
  }));

  // Reset position when modal opens
  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
  }, [selectedItem, translateY]);

  return (
    <View className="flex-1 justify-end">
      {/* Backdrop */}
      <Pressable onPress={onClose} className="absolute inset-0">
        <Animated.View
          style={backdropAnimatedStyle}
          className="flex-1 bg-black/50"
        />
      </Pressable>

      {/* Bottom Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle} className="bg-white rounded-t-3xl">
          {/* Drag Handle - This is the draggable area */}
          <View className="items-center pt-3 pb-2">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </View>

          {/* Content */}
          <View className="px-6 pb-8">
            {/* Header with Close Button */}
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text
                  className="text-lg font-bold text-gray-900"
                  numberOfLines={2}
                >
                  {selectedItem?.phrase}
                </Text>
                {selectedItem?.translation && (
                  <Text className="text-gray-500 text-sm mt-1">
                    &quot;{selectedItem.translation}&quot;
                  </Text>
                )}
              </View>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color="black" />
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View className="gap-2">
              <Pressable
                onPress={() => onAction("play")}
                className="flex-row items-center px-4 py-4 bg-gray-50 rounded-2xl active:bg-gray-100"
              >
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <Volume2 size={20} color="#3b82f6" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Play Audio
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onAction("translate")}
                className="flex-row items-center px-4 py-4 bg-gray-50 rounded-2xl active:bg-gray-100"
              >
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <Languages size={20} color="#3b82f6" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Translate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onAction("conversation")}
                className="flex-row items-center px-4 py-4 bg-gray-50 rounded-2xl active:bg-gray-100"
              >
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <MessageSquare size={20} color="#3b82f6" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Start Conversation
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onAction("delete")}
                className="flex-row items-center px-4 py-4 bg-red-50 rounded-2xl active:bg-red-100 mt-2"
              >
                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4">
                  <Trash2 size={20} color="#ef4444" />
                </View>
                <Text className="text-base font-semibold text-red-500">
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Animated Checkbox with smooth "drawing" animation
function AnimatedCheckbox({ isChecked }: { isChecked: boolean }) {
  const progress = useSharedValue(isChecked ? 1 : 0);
  const pathLength = 22;

  // Sync prop to shared value for animation
  useEffect(() => {
    progress.value = withTiming(isChecked ? 1 : 0, {
      duration: 300,
    });
  }, [isChecked]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: interpolate(progress.value, [0, 1], [pathLength, 0]),
    };
  });

  const bgAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["transparent", "#3b82f6"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#d1d5db", "#3b82f6"]
      ),
      borderWidth: 2,
    };
  });

  return (
    <Animated.View
      style={bgAnimatedStyle}
      className="w-6 h-6 rounded-full items-center justify-center shadow-sm"
    >
      <Svg width="14" height="14" viewBox="0 0 24 24">
        <AnimatedPath
          d="M5 12l5 5L20 7"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          animatedProps={animatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

// Premium Selectable Phrase Item
function SelectablePhraseItem({
  item,
  isActive,
  isPrimary,
  onPress,
}: {
  item: VocabularyItem;
  isActive: boolean;
  isPrimary: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#ffffff", "#f8fbff"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#e5e7eb", "#3b82f6"]
      ),
      shadowColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#000000", "#3b82f6"]
      ),
      shadowOpacity: interpolate(progress.value, [0, 1], [0.05, 0.08]),
      shadowRadius: interpolate(progress.value, [0, 1], [4, 8]),
      elevation: interpolate(progress.value, [0, 1], [1, 2]),
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          animatedStyle,
          { borderWidth: 1.5, borderRadius: 24, padding: 20 },
        ]}
        className="flex-row items-center"
      >
        <View className="flex-1 pr-4">
          <View className="flex-row items-center flex-wrap gap-2 mb-1">
            <Text className="font-bold text-lg text-gray-900" numberOfLines={2}>
              {item.phrase}
            </Text>
            {isPrimary && (
              <View className="bg-white px-2 py-0.5 rounded-full border border-gray-300">
                <Text className="text-blue-500 text-[10px] font-black uppercase tracking-widest">
                  Primary
                </Text>
              </View>
            )}
          </View>
          {item.translation && (
            <Text
              className={`text-sm ${
                isActive ? "text-blue-600/70" : "text-gray-500"
              }`}
              numberOfLines={2}
            >
              {item.translation}
            </Text>
          )}
        </View>

        <AnimatedCheckbox isChecked={isActive} />
      </Animated.View>
    </Pressable>
  );
}
