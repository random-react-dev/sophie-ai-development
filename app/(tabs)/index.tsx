import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import {
  CATEGORIES,
  CEFRLevel,
  CEFR_LEVELS,
  Scenario,
} from "@/constants/scenarios";
import { useAuthStore } from "@/stores/authStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import {
  Bed,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Coffee,
  Compass,
  GraduationCap,
  Headphones,
  Mic,
  Plane,
  Plus,
  Sparkles,
  Star,
  Users,
  Utensils,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
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

const IconMap: Record<string, any> = {
  coffee: Coffee,
  briefcase: Briefcase,
  compass: Compass,
  bed: Bed,
  mic: Mic,
};

export default function RoleplayScreen() {
  const {
    scenarios,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectScenario,
  } = useScenarioStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [scenarios, searchQuery, selectedCategory]);

  const handleStartScenario = (scenario: Scenario) => {
    selectScenario(scenario);
    router.push("/(tabs)/talk" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 py-4 mb-2 flex-row justify-center items-center relative">
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

      <View className="px-4 mb-8">
        <Text className="text-3xl font-bold text-black text-left">
          Choose a Scenario
        </Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          Practice real-life conversations
        </Text>
      </View>

      {/* Search and Create Row */}
      <View className="px-4 flex-row gap-2 mb-6">
        <View className="flex-1 h-12 bg-surface shadow-lg rounded-full flex-row items-center px-4">
          <Feather name="search" size={20} color="gray" />
          <TextInput
            placeholder="Search scenarios..."
            className="flex-1 ml-3 text-gray-900 font-medium text-base"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="gray"
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setCreateModalVisible(true)}
          className="h-12 px-4 bg-blue-500 rounded-full flex-row items-center gap-2"
        >
          <Plus size={20} color="white" />
          <Text className="text-white font-bold text-base">Create</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View className="mb-6">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full border ${
                selectedCategory === cat
                  ? "bg-blue-100 border-blue-300"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`font-bold text-[13px] ${
                  selectedCategory === cat ? "text-blue-500" : "text-gray-600"
                }`}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scenarios List */}
      <FlatList
        data={filteredScenarios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const Icon = IconMap[item.icon] || Sparkles;
          const bgColor = "bg-surface";

          return (
            <TouchableOpacity
              onPress={() => handleStartScenario(item)}
              activeOpacity={0.7}
              className={`mb-4 p-4 rounded-2xl shadow-lg flex-row items-center ${bgColor}`}
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center transform scale-110">
                <Icon size={28} color="gray" />
              </View>
              <View className="flex-1 ml-6">
                <Text className="text-xl font-bold text-black">
                  {item.title}
                </Text>
                <Text className="text-gray-400 text-base font-medium">
                  {item.category}
                </Text>
                <Text
                  className="text-gray-400 text-sm font-medium"
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              </View>
              <ChevronRight size={24} color="gray" />
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={() => (
          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.7}
            className="mb-4 p-5 rounded-2xl flex-row items-center border-2 border-dashed border-gray-300 shadow-lg"
          >
            <View className="w-12 h-12 rounded-xl items-center justify-center">
              <Star size={24} color="#6b7280" />
            </View>
            <View className="flex-1 ml-6">
              <Text className="text-xl font-bold text-gray-500">
                Create Your Own
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center my-10">
            <Text className="text-gray-400 font-medium italic">
              No scenarios found
            </Text>
          </View>
        }
      />

      <CreateScenarioModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function CreateScenarioModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { addCustomScenario, selectScenario } = useScenarioStore();
  const router = useRouter();
  const [sophieRole, setSophieRole] = useState("");
  const [userRole, setUserRole] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<CEFRLevel>("S3");
  const [category, setCategory] = useState<string>("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [context, setContext] = useState("");

  // Alert modal for validation errors
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleCreate = () => {
    if (!sophieRole || !topic) {
      showAlert(
        "Required Fields Missing",
        "Sophie's Role and Topic are required!",
        [{ text: "OK", style: "default" }],
        "warning"
      );
      return;
    }

    const newScenario: Scenario = {
      id: Math.random().toString(36).substring(7),
      title: topic,
      category: "Custom",
      description: context || `Roleplay about ${topic}`,
      sophieRole,
      userRole: userRole || "Learner",
      topic,
      level,
      context: context || `A conversation about ${topic}`,
      icon: "mic",
    };

    addCustomScenario(newScenario);
    onClose();
    selectScenario(newScenario);
    router.push("/(tabs)/talk" as any);
  };

  return (
    <>
      {/* Modal for creating a new scenario */}
      <Modal
        visible={visible}
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
                Create Scenario
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
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
                  Sophie&apos;s Role <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  placeholder="e.g. A grumpy but helpful shopkeeper"
                  placeholderTextColor="gray"
                  className="bg-gray-50 rounded-full px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                  value={sophieRole}
                  onChangeText={setSophieRole}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Your Role
                </Text>
                <TextInput
                  placeholder="e.g. A customer in a hurry"
                  placeholderTextColor="gray"
                  className="bg-gray-50 rounded-full px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                  value={userRole}
                  onChangeText={setUserRole}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Topic <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  placeholder="e.g. Buying a vintage watch"
                  placeholderTextColor="gray"
                  className="bg-gray-50 rounded-full px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                  value={topic}
                  onChangeText={setTopic}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Level
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {CEFR_LEVELS.map((l) => (
                    <TouchableOpacity
                      key={l}
                      activeOpacity={0.7}
                      onPress={() => setLevel(l)}
                      className={`px-4 py-2 rounded-full border ${
                        level === l
                          ? "bg-blue-100 border-blue-300"
                          : "bg-surface border-gray-300"
                      }`}
                    >
                      <Text
                        className={`font-bold text-xs ${
                          level === l ? "text-blue-500" : "text-gray-600"
                        }`}
                      >
                        {l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Dropdown */}
              <View className="mb-6">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Category
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                  }
                  className={`bg-surface rounded-2xl px-4 py-4 flex-row justify-between items-center shadow-sm ${
                    isCategoryDropdownOpen
                      ? "border-2 border-blue-400"
                      : "border border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    {category ? (
                      <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                        {category === "Food & Drink" && (
                          <Utensils size={16} color="#3b82f6" />
                        )}
                        {category === "Business" && (
                          <Briefcase size={16} color="#3b82f6" />
                        )}
                        {category === "Social" && (
                          <Users size={16} color="#3b82f6" />
                        )}
                        {category === "Travel" && (
                          <Plane size={16} color="#3b82f6" />
                        )}
                        {category === "Customer Service" && (
                          <Headphones size={16} color="#3b82f6" />
                        )}
                        {category === "Education" && (
                          <GraduationCap size={16} color="#3b82f6" />
                        )}
                      </View>
                    ) : (
                      <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                        <Sparkles size={16} color="#9ca3af" />
                      </View>
                    )}
                    <Text
                      className={`font-bold text-base ${
                        category ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {category || "Select a category"}
                    </Text>
                  </View>
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      isCategoryDropdownOpen ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    <ChevronDown
                      size={18}
                      color={isCategoryDropdownOpen ? "#3b82f6" : "#6b7280"}
                      style={{
                        transform: [
                          {
                            rotate: isCategoryDropdownOpen ? "180deg" : "0deg",
                          },
                        ],
                      }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Premium Dropdown Options */}
                {isCategoryDropdownOpen && (
                  <View className="mt-3 bg-surface rounded-2xl border border-gray-100 overflow-hidden shadow-xl">
                    {CATEGORIES.filter((cat) => cat !== "All").map(
                      (cat, index, arr) => {
                        const isSelected = category === cat;
                        const isLast = index === arr.length - 1;

                        // Get icon for each category
                        const getCategoryIcon = () => {
                          switch (cat) {
                            case "Food & Drink":
                              return (
                                <Utensils
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                            case "Business":
                              return (
                                <Briefcase
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                            case "Social":
                              return (
                                <Users
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                            case "Travel":
                              return (
                                <Plane
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                            case "Customer Service":
                              return (
                                <Headphones
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                            case "Education":
                              return (
                                <GraduationCap
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                            default:
                              return (
                                <Sparkles
                                  size={18}
                                  color={isSelected ? "#3b82f6" : "#6b7280"}
                                />
                              );
                          }
                        };

                        return (
                          <TouchableOpacity
                            key={cat}
                            activeOpacity={0.6}
                            onPress={() => {
                              setCategory(cat);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`px-4 py-3.5 flex-row items-center justify-between ${
                              isSelected ? "bg-blue-50" : "bg-surface"
                            } ${!isLast ? "border-b border-gray-100" : ""}`}
                          >
                            <View className="flex-row items-center gap-3">
                              <View
                                className={`w-9 h-9 rounded-full items-center justify-center ${
                                  isSelected ? "bg-blue-100" : "bg-gray-100"
                                }`}
                              >
                                {getCategoryIcon()}
                              </View>
                              <Text
                                className={`font-semibold text-[15px] ${
                                  isSelected ? "text-blue-600" : "text-gray-700"
                                }`}
                              >
                                {cat}
                              </Text>
                            </View>
                            {isSelected && (
                              <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                                <Check
                                  size={14}
                                  color="white"
                                  strokeWidth={3}
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                )}
              </View>

              <View className="mb-10">
                <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">
                  Context / Situation
                </Text>
                <TextInput
                  placeholder="Describe the setting..."
                  placeholderTextColor="gray"
                  className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium h-32 text-start align-top"
                  multiline
                  value={context}
                  onChangeText={setContext}
                />
              </View>
            </ScrollView>

            <View className="px-4 py-8 border-t border-gray-100">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCreate}
                className="w-full h-16 bg-blue-500 rounded-full items-center justify-center shadow-lg"
              >
                <Text className="text-white font-bold text-lg">
                  Start Scenario
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Validation Error Modal */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </>
  );
}
