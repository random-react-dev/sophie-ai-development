import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import CircleFlag from "@/components/common/CircleFlag";
import { PageHeader } from "@/components/common/PageHeader";
import { RainbowBorder, RainbowText } from "@/components/common/Rainbow";
import LanguagePickerModal from "@/components/translate/LanguagePickerModal";
import { DEFAULT_TARGET_LANG, Language } from "@/constants/languages";
import { translateText } from "@/services/gemini/translate";
import {
  createFolder,
  deleteFromVocabulary,
  getFolders,
  getVocabulary,
  saveToVocabulary,
  VocabularyFolder,
  VocabularyItem,
} from "@/services/supabase/vocabulary";
import { useAuthStore } from "@/stores/authStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  BookOpen,
  Folder,
  Languages,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VocabScreen() {
  useAuthStore(); // Kept for auth state side effects
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
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [isFolderPickerVisible, setIsFolderPickerVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Folders Data
  const [folders, setFolders] = useState<VocabularyFolder[]>([]);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("All");

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
      const [vocabData, foldersData] = await Promise.all([
        getVocabulary(),
        getFolders(),
      ]);
      setItems(vocabData);
      setFolders(foldersData);
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
      const matchesFolder =
        selectedFolderFilter === "All" || item.folder_id === selectedFolderFilter;

      return matchesSearch && matchesLang && matchesFolder;
    });
  }, [items, searchQuery, selectedLanguage, selectedFolderFilter]);

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
      folder_id: newFolderId,
    });

    if (success) {
      setNewPhrase("");
      setNewTranslation("");
      setNewFolderId(null);
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
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      <View className="px-4 mb-8">
        <Text className="text-3xl font-bold text-black text-left">Vocab</Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          Your saved words & phrases
        </Text>
      </View>

      {/* Search and Add */}
      <View className="px-4 flex-row gap-2 mb-6">
        <View className="flex-1 h-12 bg-surface shadow-lg rounded-full flex-row items-center px-4">
          {/* <Search size={20} color="gray" /> */}
          <Feather name="search" size={20} color="gray" />
          <TextInput
            placeholder="Search saved words..."
            className="flex-1 ml-3 text-gray-900 font-medium text-base p-0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="gray"
            textAlignVertical="center"
            style={{ includeFontPadding: false }}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsAddModalVisible(true)}
          className="h-12 rounded-full overflow-hidden"
        >
          <RainbowBorder
            borderWidth={2}
            borderRadius={9999}
            className="flex-1"
            containerClassName="flex-row items-center justify-center px-4 gap-2"
          >
            <Plus size={20} color="black" />
            <Text className="text-black font-bold text-base">Add</Text>
          </RainbowBorder>
        </TouchableOpacity>
      </View>

      {/* Language Filter Chips */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {languages.map((lang) => {
            const isSelected = selectedLanguage === lang;

            if (isSelected) {
              return (
                <TouchableOpacity
                  key={lang}
                  activeOpacity={0.7}
                  onPress={() => setSelectedLanguage(lang)}
                >
                  <RainbowBorder
                    borderRadius={9999}
                    borderWidth={1}
                    className="flex-1"
                    containerClassName="px-5 py-2"
                  >
                    <Text className="font-bold text-sm text-black">
                      {lang}
                    </Text>
                  </RainbowBorder>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                key={lang}
                onPress={() => setSelectedLanguage(lang)}
                className="px-5 py-2 rounded-full border border-gray-300 bg-white"
              >
                <Text className="font-bold text-sm text-gray-600">
                  {lang}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Folder Filter Chips */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {["All", ...folders].map((folder) => {
            const isAll = typeof folder === "string";
            const id = isAll ? "All" : (folder as VocabularyFolder).id;
            const name = isAll ? "All Folders" : (folder as VocabularyFolder).name;
            const isSelected = selectedFolderFilter === id;

            if (isSelected) {
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedFolderFilter(id)}
                >
                  <RainbowBorder
                    borderRadius={9999}
                    borderWidth={1}
                    className="flex-1"
                    containerClassName="px-4 py-1.5"
                  >
                    <View className="flex-row items-center gap-2">
                      {!isAll && <Folder size={12} color="black" />}
                      <Text className="font-bold text-xs text-black">{name}</Text>
                    </View>
                  </RainbowBorder>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                key={id}
                onPress={() => setSelectedFolderFilter(id)}
                className="px-4 py-1.5 rounded-full border border-gray-300 bg-white flex-row items-center gap-2"
              >
                {!isAll && <Folder size={12} color="gray" />}
                <Text className="font-bold text-xs text-gray-600">{name}</Text>
              </TouchableOpacity>
            );
          })}
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
          keyExtractor={(item) => item.id || item.phrase}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
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
              className="mb-4 p-4 rounded-2xl shadow-lg flex-row items-center bg-surface"
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
                  {item.folder && (
                    <View className="flex-row items-center gap-1.5 mt-2 bg-purple-50 self-start px-2 py-1 rounded-md">
                      <Folder size={10} color="#a855f7" />
                      <Text className="text-purple-600 text-[10px] font-bold">
                        {item.folder.name}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center gap-3">
                  {/* Mic Icon */}
                  <TouchableOpacity
                    onPress={() => handlePlay(item.phrase)}
                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <FontAwesome name="microphone" size={14} color="black" />
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
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <Text className="text-2xl font-bold text-black">Add Phrase</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsAddModalVisible(false)}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-4 pt-6"
              showsVerticalScrollIndicator={false}
            >
              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Language
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowLangPicker(true)}
                  className="flex-row items-center bg-gray-50 px-4 py-4 rounded-2xl border border-gray-100 gap-2"
                >
                  <CircleFlag countryCode={newLanguage.countryCode} size={28} />
                  <Text className="text-lg font-semibold text-black flex-1">
                    {newLanguage.name}
                  </Text>
                  <Text className="text-gray-700 font-bold text-sm">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Folder (Optional)
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsFolderPickerVisible(true)}
                  className="flex-row items-center bg-gray-50 px-4 py-4 rounded-2xl border border-gray-100 gap-2"
                >
                  <View className="w-8 h-8 rounded-full bg-gray-100 border border-gray-100 items-center justify-center">
                    <Folder size={16} color="#6b7280" />
                  </View>
                  <Text className={`text-lg font-semibold flex-1 ${newFolderId ? "text-black" : "text-gray-400"}`}>
                    {newFolderId ? folders.find(f => f.id === newFolderId)?.name || "Selected Folder" : "Select a folder"}
                  </Text>
                  <Text className="text-black font-bold text-sm">
                    Change
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Phrase <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100 font-medium text-gray-900"
                  placeholder="Enter word or phrase..."
                  placeholderTextColor="gray"
                  value={newPhrase}
                  onChangeText={setNewPhrase}
                  multiline
                  style={{ includeFontPadding: false }}
                />
              </View>

              <View className="mb-10">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Translation (Optional)
                </Text>
                <TextInput
                  className="bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100 font-medium text-gray-900 h-32 text-start align-top"
                  placeholder="Enter meaning..."
                  placeholderTextColor="gray"
                  value={newTranslation}
                  onChangeText={setNewTranslation}
                  multiline
                  style={{ includeFontPadding: false }}
                />
              </View>
            </ScrollView>

            <View className="px-6 py-8 border-t border-gray-100">
              <TouchableOpacity
                onPress={handleAddItem}
                disabled={!newPhrase.trim()}
                activeOpacity={0.7}
                className="w-full h-16 rounded-full overflow-hidden shadow-lg"
              >
                {!newPhrase.trim() ? (
                  <View className="flex-1 bg-gray-200 items-center justify-center rounded-full">
                    <Text className="text-gray-400 font-bold text-lg">
                      Save Phrase
                    </Text>
                  </View>
                ) : (
                  <RainbowBorder
                    borderWidth={2}
                    borderRadius={9999}
                    className="flex-1"
                    containerClassName="items-center justify-center"
                  >
                    <Text className="text-black font-bold text-lg">
                      Save Phrase
                    </Text>
                  </RainbowBorder>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Folder Picker Modal */}
      <Modal
        visible={isFolderPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFolderPickerVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
            <Text className="text-2xl font-bold text-black">Select Folder</Text>
            <TouchableOpacity
              onPress={() => setIsFolderPickerVisible(false)}
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
                    className="flex-1 bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100 font-medium text-gray-900"
                    placeholder="Folder name..."
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
                      const newFolder = await createFolder(newFolderName);
                      if (newFolder) {
                        setFolders(prev => [...prev, newFolder]);
                        setNewFolderId(newFolder.id);
                        setIsCreatingFolder(false);
                        setNewFolderName("");
                        setIsFolderPickerVisible(false);
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
                      <Text className="text-black font-bold text-base">Create</Text>
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
                  <Text className="text-black font-bold text-lg">Create New Folder</Text>
                </TouchableOpacity>
              )}

              <Text className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-4 mt-2">Your Folders</Text>
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
              {folders.map(folder => {
                const isSelected = newFolderId === folder.id;
                const Content = () => (
                  <>
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                      <Folder size={20} color="gray" />
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="font-bold text-base text-gray-900">{folder.name}</Text>
                    </View>
                  </>
                );

                return (
                  <TouchableOpacity
                    key={folder.id}
                    onPress={() => {
                      setNewFolderId(folder.id);
                      setIsFolderPickerVisible(false);
                    }}
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
                        style={{ borderWidth: 1.5, borderRadius: 20, padding: 16 }}
                        className="flex-row items-center border-gray-200 bg-white"
                      >
                        <Content />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {folders.length === 0 && (
                <Text className="text-gray-400 text-center mt-10 italic">No folders yet</Text>
              )}
              {/* Padding for bottom */}
              <View className="h-20" />
            </ScrollView>
          </View>
        </SafeAreaView>
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
          <View className="px-4 py-6 bg-white border-b border-gray-100">
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
          <View className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-10 bg-white border-t border-gray-100 shadow-2xl">
            <TouchableOpacity
              onPress={startPracticeSession}
              disabled={selectedForPractice.size === 0}
              activeOpacity={0.8}
              className="shadow-lg shadow-blue-100"
            >
              {selectedForPractice.size > 0 ? (
                <RainbowBorder
                  borderRadius={9999}
                  borderWidth={2}
                  className="bg-white"
                  containerClassName="h-16 flex-row items-center justify-center"
                >
                  <Text className="font-bold text-lg text-black">
                    Start with {selectedForPractice.size} Phrase
                    {selectedForPractice.size === 1 ? "" : "s"}
                  </Text>
                </RainbowBorder>
              ) : (
                <View className="h-16 rounded-full bg-gray-200 items-center justify-center flex-row">
                  <Text className="font-bold text-lg text-gray-400">
                    Start with {selectedForPractice.size} Phrase
                    {selectedForPractice.size === 1 ? "" : "s"}
                  </Text>
                </View>
              )}
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
              {/* Temporarily removed Play Audio button
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
              */}
              <Pressable
                onPress={() => onAction("translate")}
                className="flex-row items-center px-4 py-4 bg-gray-50 rounded-2xl active:bg-gray-100"
              >
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-4">
                  <Languages size={20} color="#1f2937" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Translate
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onAction("conversation")}
                className="flex-row items-center px-4 py-4 bg-gray-50 rounded-2xl active:bg-gray-100"
              >
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-4">
                  <MessageSquare size={20} color="#1f2937" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Start Conversation
                </Text>
              </Pressable>
              {/*Temporarily removed Edit button*/}
              <Pressable
                onPress={() => { }}
                className="flex-row items-center px-4 py-4 bg-gray-50 rounded-2xl active:bg-gray-100"
              >
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-4">
                  <Pencil size={20} color="#1f2937" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Edit Vocabulary
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



// Premium Selectable Phrase Item
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
  const Content = () => (
    <>
      <View className="flex-1 pr-4">
        <View className="flex-row items-center flex-wrap gap-2 mb-1">
          <Text className="font-bold text-lg text-gray-900" numberOfLines={2}>
            {item.phrase}
          </Text>
          {isPrimary && (
            <View className="bg-white px-2 py-0.5 rounded-2xl border border-gray-300">
              <RainbowText
                text="PRIMARY"
                fontSize={10}
                fontWeight="900"
              />
            </View>
          )}
        </View>
        {item.translation && (
          <Text
            className="text-sm text-gray-500"
            numberOfLines={2}
          >
            {item.translation}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <Pressable onPress={onPress}>
      {isActive ? (
        <RainbowBorder
          borderRadius={20}
          borderWidth={2}
          containerClassName="flex-row items-center p-4"
          className="bg-white"
        >
          <Content />
        </RainbowBorder>
      ) : (
        <View
          style={{ borderWidth: 1.5, borderRadius: 20, padding: 16 }}
          className="flex-row items-center border-gray-200 bg-white"
        >
          <Content />
        </View>
      )}
    </Pressable>
  );
}
