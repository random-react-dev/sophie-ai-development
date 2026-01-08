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
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  BookOpen,
  CheckCircle2,
  MessageSquare,
  MoreVertical,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VocabScreen() {
  const { user } = useAuthStore();
  const { setPracticePhrase } = useScenarioStore();
  const router = useRouter();

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
    Alert.alert("Listen", `Playing audio for: "${text}"`);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
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
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const handleTranslateItem = async (item: VocabularyItem) => {
    if (item.translation) {
      Alert.alert("Translation", item.translation);
      return;
    }

    try {
      // Defaulting target to English if unknown, or infer from context
      const translated = await translateText(item.phrase, "English");

      // Ask to save the translation
      Alert.alert("Translation", translated, [
        { text: "Close", style: "cancel" },
        {
          text: "Save Translation",
          onPress: async () => {
            // Ideally update the item, but for now just show it
          },
        },
      ]);
    } catch {
      Alert.alert("Error", "Translation failed");
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
    Alert.alert("Options", `"${item.phrase}"`, [
      { text: "Play Audio", onPress: () => handlePlay(item.phrase) },
      { text: "Translate", onPress: () => handleTranslateItem(item) },
      { text: "Start Conversation", onPress: () => initPractice(item) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => item.id && handleDelete(item.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleAddItem = async () => {
    if (!newPhrase.trim()) {
      Alert.alert("Required", "Please enter a phrase");
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
      Alert.alert("Error", "Failed to save phrase");
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
        <Text className="text-4xl font-bold text-black text-left">Vocab</Text>
        <Text className="text-gray-500 text-lg font-medium mt-1 text-left">
          Your saved words & phrases
        </Text>
      </View>

      {/* Search and Add */}
      <View className="px-6 flex-row gap-2 mb-6">
        <View className="flex-1 h-12 bg-white shadow-lg rounded-full flex-row items-center px-4">
          <Search size={18} color="gray" />
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
              onPress={() => setSelectedLanguage(lang)}
              className={`px-4 py-2 rounded-full border ${
                selectedLanguage === lang
                  ? "bg-gray-900 border-gray-900"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  selectedLanguage === lang ? "text-white" : "text-gray-600"
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
            <View className="mb-4 bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm shadow-gray-50">
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

                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => handlePlay(item.phrase)}
                    className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center"
                  >
                    <Play size={14} color="#3b82f6" fill="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => showActionMenu(item)}
                    className="w-8 h-8 bg-gray-50 rounded-full items-center justify-center"
                  >
                    <MoreVertical size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
          <View className="flex-1 px-6 pt-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">
                Add Phrase
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full"
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <View className="mb-6">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Language
                </Text>
                <TouchableOpacity
                  onPress={() => setShowLangPicker(true)}
                  className="flex-row items-center bg-gray-50 p-4 rounded-2xl border border-gray-100"
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
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Phrase *
                </Text>
                <TextInput
                  className="bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100"
                  placeholder="Enter word or phrase..."
                  value={newPhrase}
                  onChangeText={setNewPhrase}
                  multiline
                />
              </View>

              <View className="mb-8">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Translation (Optional)
                </Text>
                <TextInput
                  className="bg-gray-50 p-4 rounded-2xl text-lg border border-gray-100"
                  placeholder="Enter meaning..."
                  value={newTranslation}
                  onChangeText={setNewTranslation}
                  multiline
                />
              </View>

              <TouchableOpacity
                onPress={handleAddItem}
                className={`w-full h-14 rounded-full items-center justify-center shadow-lg shadow-blue-200 ${
                  !newPhrase.trim() ? "bg-gray-200" : "bg-blue-500"
                }`}
                disabled={!newPhrase.trim()}
              >
                <Text className="text-white font-bold text-lg">
                  Save Phrase
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
        <View className="flex-1 bg-white">
          <View className="px-6 py-4 border-b border-gray-100 bg-white z-10">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xl font-bold text-gray-900">
                Practice Session
              </Text>
              <TouchableOpacity onPress={() => setIsMultiSelectVisible(false)}>
                <Text className="text-blue-500 font-medium">Cancel</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-gray-500 text-sm">
              Select additional phrases to include in your conversation
            </Text>
          </View>

          <FlatList
            data={filteredItems} // Show filtered list, or filteredItems to allow searching within selection? Using filteredItems is usually better UX
            keyExtractor={(item) => item.id || item.phrase}
            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isSelected = selectedForPractice.has(item.phrase);
              const isPrimary = item.id === primaryPracticeItem?.id;

              return (
                <TouchableOpacity
                  onPress={() => togglePracticeSelection(item.phrase)}
                  className={`mb-3 p-4 rounded-2xl border flex-row items-center justify-between ${
                    isSelected || isPrimary
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <View className="flex-1 mr-4">
                    <Text
                      className={`font-bold text-base ${
                        isSelected || isPrimary
                          ? "text-gray-900"
                          : "text-gray-600"
                      }`}
                    >
                      {item.phrase}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      {item.translation}
                    </Text>
                  </View>

                  {(isSelected || isPrimary) && (
                    <CheckCircle2 size={20} color="#3b82f6" fill="#3b82f6" />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View className="absolute bottom-10 left-6 right-6">
            <TouchableOpacity
              onPress={startPracticeSession}
              className="bg-blue-500 h-14 rounded-full items-center justify-center flex-row gap-2 shadow-lg shadow-blue-200"
            >
              <MessageSquare size={20} color="white" />
              <Text className="text-white font-bold text-lg">
                Start with {selectedForPractice.size} Phrases
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
