import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { PageHeader } from "@/components/common/PageHeader";
import { RainbowBorder, RainbowGradient } from "@/components/common/Rainbow";
import {
  CATEGORIES,
  CEFRLevel,
  CEFR_LEVELS,
  Scenario,
} from "@/constants/scenarios";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { useScenarioStore } from "@/stores/scenarioStore";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Activity,
  AlarmClock,
  Apple,
  Armchair,
  ArrowUpDown,
  Baby,
  Badge,
  BadgeAlert,
  BadgePercent,
  Banknote,
  Bed,
  Beer,
  BookHeart,
  BookOpen,
  BookOpenText,
  Brain,
  Briefcase,
  Building2,
  Bus,
  Cake,
  Calendar,
  CalendarCheck,
  CalendarMinus,
  CalendarPlus,
  Car,
  Carrot,
  ChefHat,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  ClipboardCheck,
  Clock,
  CloudSun,
  Coffee,
  Coins,
  Compass,
  Cookie,
  Cpu,
  CreditCard,
  Dog,
  DoorOpen,
  Dumbbell,
  Ear,
  Eye,
  FerrisWheel,
  FileX,
  Film,
  Flame,
  Flower2,
  Footprints,
  Gem,
  Ghost,
  Gift,
  Glasses,
  Globe,
  Goal,
  GraduationCap,
  Guitar,
  HandMetal,
  Handshake,
  Headphones,
  Heart,
  HeartCrack,
  HeartHandshake,
  HeartPulse,
  House,
  IceCreamCone,
  Landmark,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  LogOut,
  MailX,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Megaphone,
  Menu as MenuIcon,
  MessageCircle,
  MessageSquare,
  Mic,
  MicVocal,
  Monitor,
  Mountain,
  MountainSnow,
  Music,
  NotebookPen,
  Paintbrush,
  Palette,
  Pencil,
  Phone,
  Pizza,
  Plane,
  Plus,
  Presentation,
  Radiation,
  Rocket,
  Scale,
  School,
  Share2,
  Scroll,
  Shield,
  ShieldAlert,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Siren,
  Smile,
  SmilePlus,
  Soup,
  Sparkles,
  SprayCan,
  Star,
  Stethoscope,
  Sun,
  Sunrise,
  Target,
  Telescope,
  Thermometer,
  ThumbsUp,
  Ticket,
  Timer,
  TimerOff,
  TrainFront,
  Trees,
  TrendingUp,
  Trophy,
  Truck,
  Tv,
  Unplug,
  UserPlus,
  Users,
  UsersRound,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Wine,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { shareScenario } from "@/services/supabase/scenarios";

const IconMap: Record<string, any> = {
  // Beginner
  "hand-metal": HandMetal,
  "smile-plus": SmilePlus,
  baby: Baby,
  sun: Sun,
  palette: Palette,
  apple: Apple,
  "cloud-sun": CloudSun,
  "thumbs-up": ThumbsUp,

  // Food & Drink
  coffee: Coffee,
  utensils: Utensils,
  "ice-cream-cone": IceCreamCone,
  "chef-hat": ChefHat,
  menu: MenuIcon,
  soup: Soup,
  truck: Truck,
  cookie: Cookie,
  pizza: Pizza,
  "circle-alert": CircleAlert,

  // Shopping
  "shopping-cart": ShoppingCart,
  "credit-card": CreditCard,
  carrot: Carrot,
  shirt: Shirt,
  gift: Gift,
  "book-open": BookOpen,
  laptop: Laptop,
  "badge-percent": BadgePercent,
  "shopping-bag": ShoppingBag,

  // Travel
  compass: Compass,
  bed: Bed,
  map: MapIcon,
  globe: Globe,
  "calendar-check": CalendarCheck,
  bus: Bus,
  car: Car,
  "train-front": TrainFront,
  plane: Plane,
  "map-pin": MapPin,
  landmark: Landmark,
  wallet: Wallet,
  clock: Clock,

  // Life
  sunrise: Sunrise,
  "alarm-clock": AlarmClock,
  calendar: Calendar,
  "message-square": MessageSquare,
  house: House,
  armchair: Armchair,
  glasses: Glasses,
  dog: Dog,
  phone: Phone,
  "door-open": DoorOpen,
  flame: Flame,
  "heart-handshake": HeartHandshake,
  ear: Ear,
  dumbbell: Dumbbell,
  "book-open-text": BookOpenText,
  rocket: Rocket,
  ghost: Ghost,
  brain: Brain,

  // Social
  mic: Mic,
  trees: Trees,
  "user-plus": UserPlus,
  "calendar-plus": CalendarPlus,
  wine: Wine,
  cake: Cake,
  "flower-2": Flower2,
  lightbulb: Lightbulb,

  // Work
  briefcase: Briefcase,
  "building-2": Building2,
  badge: Badge,
  "utensils-crossed": UtensilsCrossed,
  target: Target,
  "mail-x": MailX,
  presentation: Presentation,
  goal: Goal,
  banknote: Banknote,
  "clipboard-check": ClipboardCheck,
  "trending-up": TrendingUp,
  "timer-off": TimerOff,

  // Romance
  sparkles: Sparkles,
  heart: Heart,
  eye: Eye,
  "book-heart": BookHeart,
  "arrow-up-down": ArrowUpDown,
  "heart-pulse": HeartPulse,
  mountain: Mountain,
  "heart-crack": HeartCrack,
  unplug: Unplug,
  gem: Gem,
  shield: Shield,
  "users-round": UsersRound,

  // Entertainment
  headphones: Headphones,
  ticket: Ticket,
  star: Star,
  music: Music,
  guitar: Guitar,
  "ferris-wheel": FerrisWheel,
  clapperboard: Clapperboard,
  trophy: Trophy,
  paintbrush: Paintbrush,
  tv: Tv,
  film: Film,

  // Education
  school: School,
  "notebook-pen": NotebookPen,
  languages: Languages,
  pencil: Pencil,
  timer: Timer,
  "file-x": FileX,
  handshake: Handshake,
  "graduation-cap": GraduationCap,

  // Health
  stethoscope: Stethoscope,
  "shield-alert": ShieldAlert,
  siren: Siren,
  thermometer: Thermometer,
  activity: Activity,

  // Persuade
  footprints: Footprints,
  "spray-can": SprayCan,
  "map-pinned": MapPinned,
  megaphone: Megaphone,
  "mountain-snow": MountainSnow,
  "badge-alert": BadgeAlert,
  "log-out": LogOut,
  radiation: Radiation,
  "mic-vocal": MicVocal,
  "message-circle": MessageCircle,

  // Debates
  monitor: Monitor,
  "calendar-minus": CalendarMinus,
  beer: Beer,
  leaf: Leaf,
  cpu: Cpu,
  scroll: Scroll,
  coins: Coins,
  telescope: Telescope,
  scale: Scale,

  // Misc
  smile: Smile,
  users: Users,
};

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RoleplayScreen() {
  const {
    scenarios,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectScenario,
    updateScenarioShareToken,
  } = useScenarioStore();
  useAuthStore(); // Kept for potential auth state side effects
  const { t } = useTranslation();
  const router = useRouter();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const translatedScenarios = scenarios.map((s) => {
    // Don't translate custom scenarios
    if (s.isCustom) {
      return s;
    }
    return {
      ...s,
      title: t(`scenarios_data.${s.id}.title`, { defaultValue: s.title }),
      description: t(`scenarios_data.${s.id}.description`, {
        defaultValue: s.description,
      }),
      sophieRole: t(`scenarios_data.${s.id}.sophieRole`, {
        defaultValue: s.sophieRole,
      }),
      userRole: t(`scenarios_data.${s.id}.userRole`, {
        defaultValue: s.userRole,
      }),
      topic: t(`scenarios_data.${s.id}.topic`, { defaultValue: s.topic }),
      context: t(`scenarios_data.${s.id}.context`, {
        defaultValue: s.context,
      }),
    };
  });

  const filteredScenarios = translatedScenarios.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartScenario = (scenario: Scenario) => {
    selectScenario(scenario);
    router.push("/(tabs)/talk" as any);
  };

  const handleShareScenario = async (scenario: Scenario) => {
    try {
      let token: string | undefined = scenario.shareToken;
      if (!token) {
        const fetched = await shareScenario(scenario);
        if (!fetched) return;
        token = fetched;
        updateScenarioShareToken(scenario.id, fetched);
      }
      const webLink = `${process.env.EXPO_PUBLIC_SHARE_BASE_URL}?token=${token}`;
      await Share.share({
        message: `Practice this conversation scenario on Sophie AI!\n\n${webLink}`,
      });
    } catch (error) {
      console.error("Error sharing scenario:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <PageHeader />

      {/* title and subtitle */}
      <View className="px-4 mb-8">
        <Text className="text-xl font-bold text-black text-left">
          {t("scenarios_screen.title")}
        </Text>
        <Text className="text-gray-500 text-base font-medium mt-1 text-left">
          {t("scenarios_screen.subtitle")}
        </Text>
      </View>

      {/* Search and Create Row */}
      <View className="px-4 flex-row gap-2 mb-6">
        <View className="flex-1 h-12 bg-surface shadow-lg rounded-full flex-row items-center px-4">
          <Feather name="search" size={20} color="gray" />
          <TextInput
            placeholder={t("scenarios_screen.search_placeholder")}
            className="flex-1 ml-3 text-gray-900 font-medium text-sm p-0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="gray"
            textAlignVertical="center"
            style={{ includeFontPadding: false }}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setCreateModalVisible(true)}
          className="h-12 rounded-full overflow-hidden"
        >
          <RainbowBorder
            borderWidth={2}
            borderRadius={9999}
            className="flex-1"
            containerClassName="flex-row items-center gap-2 px-4 justify-center flex-1"
            innerBackgroundClassName="bg-white"
          >
            <Plus size={20} color="black" />
            <Text className="text-black font-bold text-base">
              {t("scenarios_screen.create_button")}
            </Text>
          </RainbowBorder>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View className="mb-6">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const catKeyMap: Record<string, string> = {
              All: "all",
              Beginner: "beginner",
              "Food & Drink": "food_drink",
              Shopping: "shopping",
              Entertainment: "entertainment",
              Life: "life",
              Travel: "travel",
              Social: "social",
              Work: "work",
              Romance: "romance",
              Health: "health",
              Persuade: "persuade",
              Debates: "debates",
              Education: "education",
              Business: "business",
              "Customer Service": "customer_service",
            };
            const catLabel = catKeyMap[cat]
              ? t(`scenarios_screen.categories.${catKeyMap[cat]}`)
              : cat;

            if (isSelected) {
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <RainbowBorder
                    borderRadius={9999}
                    borderWidth={1}
                    className="flex-1"
                    containerClassName="px-5 py-2"
                  >
                    {/* category name */}
                    <Text className="font-bold text-sm text-black">
                      {catLabel}
                    </Text>
                  </RainbowBorder>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className="px-5 py-2 rounded-full border border-gray-300 bg-white"
              >
                <Text className="font-bold text-sm text-gray-600">
                  {catLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scenarios List with Top Fade Effect */}
      <View className="flex-1 relative">
        {/* Top Fade Gradient Overlay */}
        <View
          className="absolute top-0 left-0 right-0 z-10 h-6"
          pointerEvents="none"
        >
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient
                id="topFadeGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor="#F8F8F8" stopOpacity="1" />
                <Stop offset="100%" stopColor="#F8F8F8" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#topFadeGrad)"
            />
          </Svg>
        </View>

        <FlatList
          testID="scenario-list"
          data={filteredScenarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          renderItem={({ item }) => {
            const Icon = IconMap[item.icon] || Sparkles;
            const bgColor = "bg-surface";

            return (
              <TouchableOpacity
                onPress={() => handleStartScenario(item)}
                activeOpacity={0.7}
                className={`mb-4 p-4 rounded-2xl shadow-lg flex-row items-center ${bgColor}`}
              >
                <View className="w-12 h-12 rounded-full items-center justify-center bg-blue-100/60">
                  <Icon size={24} color="#3b82f6" />
                </View>
                <View className="flex-1 ml-6">
                  <Text className="text-base font-bold text-black">
                    {item.title}
                  </Text>
                  <Text className="text-gray-400 text-sm font-medium">
                    {(() => {
                      const cardCatKeyMap: Record<string, string> = {
                        All: "all",
                        Beginner: "beginner",
                        "Food & Drink": "food_drink",
                        Shopping: "shopping",
                        Entertainment: "entertainment",
                        Life: "life",
                        Travel: "travel",
                        Social: "social",
                        Work: "work",
                        Romance: "romance",
                        Health: "health",
                        Persuade: "persuade",
                        Debates: "debates",
                        Education: "education",
                        Business: "business",
                        "Customer Service": "customer_service",
                      };
                      const key = cardCatKeyMap[item.category];
                      return key
                        ? t(`scenarios_screen.categories.${key}`, {
                            defaultValue: item.category,
                          })
                        : item.category;
                    })()}
                  </Text>
                  <Text
                    className="text-gray-400 text-sm font-medium"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  {item.isCustom && (
                    <TouchableOpacity
                      onPress={() => handleShareScenario(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      className="w-9 h-9 items-center justify-center rounded-full bg-blue-50"
                    >
                      <Share2 size={16} color="#3b82f6" />
                    </TouchableOpacity>
                  )}
                  <ChevronRight size={24} color="gray" />
                </View>
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
                <Text className="text-base font-bold text-gray-500">
                  {t("scenarios_screen.create_your_own")}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center my-10">
              <Text className="text-gray-400 font-medium italic">
                {t("scenarios_screen.empty_list")}
              </Text>
            </View>
          }
        />
      </View>

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
  const { addCustomScenario, selectScenario, updateScenarioShareToken } = useScenarioStore();
  const { t } = useTranslation();
  const router = useRouter();
  const [sophieRole, setSophieRole] = useState("");
  const [userRole, setUserRole] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<CEFRLevel>("S3");
  const [category, setCategory] = useState<string>("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [context, setContext] = useState("");
  const [createdScenario, setCreatedScenario] = useState<Scenario | null>(null);

  // Reset success state each time the modal opens
  React.useEffect(() => {
    if (visible) setCreatedScenario(null);
  }, [visible]);

  // Alert modal for validation errors
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleCreate = () => {
    if (!sophieRole || !topic) {
      showAlert(
        t("scenarios_screen.create_modal.validation_title"),
        t("scenarios_screen.create_modal.validation_message"),
        [{ text: "OK", style: "default" }],
        "warning",
      );
      return;
    }

    const newScenario: Scenario = {
      id: Math.random().toString(36).substring(7),
      title: topic,
      category: category || "Custom",
      description: context || `Roleplay about ${topic}`,
      sophieRole,
      userRole: userRole || "Learner",
      topic,
      level,
      context: context || `A conversation about ${topic}`,
      icon: "mic",
      isCustom: true,
    };

    addCustomScenario(newScenario);
    setCreatedScenario(newScenario);
  };

  const handleStartFromSuccess = () => {
    if (!createdScenario) return;
    onClose();
    selectScenario(createdScenario);
    router.push("/(tabs)/talk" as any);
  };

  const handleShareFromModal = async () => {
    if (!createdScenario) return;
    try {
      let token: string | undefined = createdScenario.shareToken;
      if (!token) {
        const fetched = await shareScenario(createdScenario);
        if (!fetched) return;
        token = fetched;
        updateScenarioShareToken(createdScenario.id, fetched);
        setCreatedScenario({ ...createdScenario, shareToken: fetched });
      }
      const webLink = `${process.env.EXPO_PUBLIC_SHARE_BASE_URL}?token=${token}`;
      await Share.share({
        message: `Practice this conversation scenario on Sophie AI!\n\n${webLink}`,
      });
    } catch (error) {
      console.error("Error sharing from modal:", error);
    }
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
            {createdScenario ? (
              <View className="flex-1 px-6 pt-6">
                <View className="flex-row justify-end mb-4">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onClose}
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons name="close" size={24} color="black" />
                  </TouchableOpacity>
                </View>
                <View className="flex-1 items-center justify-center pb-12">
                  <View className="w-20 h-20 rounded-full bg-purple-50 items-center justify-center mb-6">
                    <Sparkles size={40} color="#8b5cf6" />
                  </View>
                  <Text className="text-2xl font-bold text-black text-center mb-2">
                    Scenario Created!
                  </Text>
                  <Text className="text-gray-500 text-center font-medium mb-10">
                    {createdScenario.title}
                  </Text>
                  <View className="w-full gap-3">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleStartFromSuccess}
                      className="h-16 rounded-full overflow-hidden shadow-lg"
                    >
                      <RainbowBorder
                        borderWidth={2}
                        borderRadius={9999}
                        className="flex-1"
                        containerClassName="items-center justify-center flex-1"
                      >
                        <Text className="text-black font-bold text-lg">
                          {t("scenarios_screen.create_modal.start_button")}
                        </Text>
                      </RainbowBorder>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleShareFromModal}
                      className="h-14 rounded-full border-2 border-blue-200 bg-blue-50 flex-row items-center justify-center gap-2"
                    >
                      <Share2 size={20} color="#3b82f6" />
                      <Text className="text-blue-600 font-bold text-base">
                        Share Scenario
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
            <>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <Text className="text-xl font-bold text-black">
                {t("scenarios_screen.create_modal.title")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {/* ScrollView with Top Fade Effect */}
            <View className="flex-1 relative">
              {/* Top Fade Gradient Overlay */}
              <View
                className="absolute top-0 left-0 right-0 z-10 h-6"
                pointerEvents="none"
              >
                <Svg width="100%" height="100%" preserveAspectRatio="none">
                  <Defs>
                    <LinearGradient
                      id="modalTopFadeGrad"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="url(#modalTopFadeGrad)"
                  />
                </Svg>
              </View>

              <ScrollView
                className="flex-1 px-4 pt-6"
                showsVerticalScrollIndicator={false}
              >
                <View className="mb-6">
                  <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                    {t("scenarios_screen.create_modal.sophie_role_label")}{" "}
                    <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    placeholder={t(
                      "scenarios_screen.create_modal.sophie_role_placeholder",
                    )}
                    placeholderTextColor="gray"
                    className="bg-gray-50 rounded-2xl px-4 text-gray-900 border border-gray-100 font-medium text-sm h-14 p-0"
                    value={sophieRole}
                    onChangeText={setSophieRole}
                    textAlignVertical="center"
                    style={{ includeFontPadding: false }}
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                    {t("scenarios_screen.create_modal.user_role_label")}
                  </Text>
                  <TextInput
                    placeholder={t(
                      "scenarios_screen.create_modal.user_role_placeholder",
                    )}
                    placeholderTextColor="gray"
                    className="bg-gray-50 rounded-2xl px-4 text-gray-900 border border-gray-100 font-medium text-sm h-14 p-0"
                    value={userRole}
                    onChangeText={setUserRole}
                    textAlignVertical="center"
                    style={{ includeFontPadding: false }}
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                    {t("scenarios_screen.create_modal.topic_label")}{" "}
                    <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    placeholder={t(
                      "scenarios_screen.create_modal.topic_placeholder",
                    )}
                    placeholderTextColor="gray"
                    className="bg-gray-50 rounded-2xl px-4 text-gray-900 border border-gray-100 font-medium text-sm h-14 p-0"
                    value={topic}
                    onChangeText={setTopic}
                    textAlignVertical="center"
                    style={{ includeFontPadding: false }}
                  />
                </View>

                {/* level */}
                <View className="mb-6">
                  <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                    {t("scenarios_screen.create_modal.level_label")}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {CEFR_LEVELS.map((l) => {
                      const isSelected = level === l;

                      if (isSelected) {
                        return (
                          <TouchableOpacity
                            key={l}
                            activeOpacity={0.7}
                            onPress={() => setLevel(l)}
                          >
                            <RainbowBorder
                              borderRadius={9999}
                              borderWidth={1}
                              containerClassName="px-5 py-2"
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
                          onPress={() => setLevel(l)}
                          className="px-5 py-2 rounded-full border border-gray-300"
                        >
                          <Text className="font-bold text-sm text-gray-600">
                            {l}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Category Dropdown */}
                <View className="mb-6">
                  <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                    {t("scenarios_screen.create_modal.category_label")}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                    }}
                  >
                    {isCategoryDropdownOpen ? (
                      <RainbowBorder
                        borderRadius={16}
                        borderWidth={2}
                        innerBackgroundClassName="bg-white"
                        containerClassName="px-4 h-16 flex-row justify-between items-center"
                      >
                        <View className="flex-1 flex-row items-center gap-3">
                          {category ? (
                            <View className="w-8 h-8 rounded-full bg-white border border-gray-50 items-center justify-center shadow-sm">
                              {category === "Food & Drink" && (
                                <Utensils size={16} color="black" />
                              )}
                              {category === "Business" && (
                                <Briefcase size={16} color="black" />
                              )}
                              {category === "Social" && (
                                <Users size={16} color="black" />
                              )}
                              {category === "Travel" && (
                                <Plane size={16} color="black" />
                              )}
                              {category === "Customer Service" && (
                                <Headphones size={16} color="black" />
                              )}
                              {category === "Education" && (
                                <GraduationCap size={16} color="black" />
                              )}
                            </View>
                          ) : (
                            <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                              <Sparkles size={16} color="#9ca3af" />
                            </View>
                          )}
                          <Text
                            numberOfLines={1}
                            className={`flex-1 font-bold text-base ${category ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {category
                              ? (() => {
                                  const catLabel =
                                    category === "Food & Drink"
                                      ? t(
                                          "scenarios_screen.categories.food_drink",
                                        )
                                      : category === "Business"
                                        ? t(
                                            "scenarios_screen.categories.business",
                                          )
                                        : category === "Social"
                                          ? t(
                                              "scenarios_screen.categories.social",
                                            )
                                          : category === "Travel"
                                            ? t(
                                                "scenarios_screen.categories.travel",
                                              )
                                            : category === "Customer Service"
                                              ? t(
                                                  "scenarios_screen.categories.customer_service",
                                                )
                                              : category === "Education"
                                                ? t(
                                                    "scenarios_screen.categories.education",
                                                  )
                                                : category;
                                  return catLabel;
                                })()
                              : t(
                                  "scenarios_screen.create_modal.category_placeholder",
                                )}
                          </Text>
                        </View>
                        <ChevronDown
                          size={18}
                          color="black"
                          style={{ transform: [{ rotate: "180deg" }] }}
                        />
                      </RainbowBorder>
                    ) : (
                      <View className="bg-white rounded-2xl px-4 h-16 flex-row justify-between items-center border border-gray-300">
                        <View className="flex-1 flex-row items-center gap-3">
                          {category ? (
                            <View className="size-8 rounded-full bg-gray-100 items-center justify-center">
                              {category === "Food & Drink" && (
                                <Utensils size={16} color="#6b7280" />
                              )}
                              {category === "Business" && (
                                <Briefcase size={16} color="#6b7280" />
                              )}
                              {category === "Social" && (
                                <Users size={16} color="#6b7280" />
                              )}
                              {category === "Travel" && (
                                <Plane size={16} color="#6b7280" />
                              )}
                              {category === "Customer Service" && (
                                <Headphones size={16} color="#6b7280" />
                              )}
                              {category === "Education" && (
                                <GraduationCap size={16} color="#6b7280" />
                              )}
                            </View>
                          ) : (
                            <View className="size-8 rounded-full bg-gray-100 items-center justify-center">
                              <Sparkles size={16} color="#9ca3af" />
                            </View>
                          )}
                          <Text
                            numberOfLines={1}
                            className={`flex-1 font-bold text-base ${category ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {category
                              ? (() => {
                                  const catLabel =
                                    category === "Food & Drink"
                                      ? t(
                                          "scenarios_screen.categories.food_drink",
                                        )
                                      : category === "Business"
                                        ? t(
                                            "scenarios_screen.categories.business",
                                          )
                                        : category === "Social"
                                          ? t(
                                              "scenarios_screen.categories.social",
                                            )
                                          : category === "Travel"
                                            ? t(
                                                "scenarios_screen.categories.travel",
                                              )
                                            : category === "Customer Service"
                                              ? t(
                                                  "scenarios_screen.categories.customer_service",
                                                )
                                              : category === "Education"
                                                ? t(
                                                    "scenarios_screen.categories.education",
                                                  )
                                                : category;
                                  return catLabel;
                                })()
                              : t(
                                  "scenarios_screen.create_modal.category_placeholder",
                                )}
                          </Text>
                        </View>
                        <ChevronDown size={18} color="#6b7280" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Dropdown Options */}
                  {isCategoryDropdownOpen && (
                    <View className="mt-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      {CATEGORIES.filter((cat) => cat !== "All").map(
                        (cat, index, arr) => {
                          const isSelected = category === cat;
                          const isLast = index === arr.length - 1;

                          const getCategoryIcon = () => {
                            const iconColor = isSelected ? "black" : "#6b7280";
                            switch (cat) {
                              case "Food & Drink":
                                return <Utensils size={16} color={iconColor} />;
                              case "Business":
                                return (
                                  <Briefcase size={16} color={iconColor} />
                                );
                              case "Social":
                                return <Users size={16} color={iconColor} />;
                              case "Travel":
                                return <Plane size={16} color={iconColor} />;
                              case "Customer Service":
                                return (
                                  <Headphones size={16} color={iconColor} />
                                );
                              case "Education":
                                return (
                                  <GraduationCap size={16} color={iconColor} />
                                );
                              default:
                                return <Sparkles size={16} color={iconColor} />;
                            }
                          };

                          return (
                            <TouchableOpacity
                              key={cat}
                              activeOpacity={0.7}
                              onPress={() => {
                                setCategory(cat);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`px-4 py-3.5 flex-row items-center overflow-hidden relative ${
                                !isLast ? "border-b border-gray-100" : ""
                              }`}
                            >
                              {isSelected && (
                                <View className="absolute inset-0">
                                  <RainbowGradient className="flex-1 opacity-20" />
                                </View>
                              )}
                              <View className="flex-1 flex-row items-center gap-2.5">
                                <View
                                  className={`size-8 rounded-full items-center justify-center ${isSelected ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-100"}`}
                                >
                                  {getCategoryIcon()}
                                </View>
                                <Text
                                  className={`flex-1 font-semibold text-sm ${isSelected ? "text-gray-900" : "text-gray-700"}`}
                                >
                                  {cat === "All"
                                    ? t("scenarios_screen.categories.all")
                                    : cat === "Food & Drink"
                                      ? t(
                                          "scenarios_screen.categories.food_drink",
                                        )
                                      : cat === "Business"
                                        ? t(
                                            "scenarios_screen.categories.business",
                                          )
                                        : cat === "Social"
                                          ? t(
                                              "scenarios_screen.categories.social",
                                            )
                                          : cat === "Travel"
                                            ? t(
                                                "scenarios_screen.categories.travel",
                                              )
                                            : cat === "Customer Service"
                                              ? t(
                                                  "scenarios_screen.categories.customer_service",
                                                )
                                              : cat === "Education"
                                                ? t(
                                                    "scenarios_screen.categories.education",
                                                  )
                                                : cat}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  )}
                </View>

                <View className="mb-10">
                  <Text className="text-gray-500 text-sm font-semibold capitalize mb-2 ml-1">
                    {t("scenarios_screen.create_modal.context_label")}
                  </Text>
                  <TextInput
                    placeholder={t(
                      "scenarios_screen.create_modal.context_placeholder",
                    )}
                    placeholderTextColor="gray"
                    className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium text-sm h-32 text-start align-top"
                    multiline
                    value={context}
                    onChangeText={setContext}
                  />
                </View>
              </ScrollView>
            </View>

            <View className="px-4 py-8 border-t border-gray-100">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCreate}
                className="w-full h-16 rounded-full overflow-hidden shadow-lg"
              >
                {/* Create Scenario */}
                <RainbowBorder
                  borderWidth={2}
                  borderRadius={9999}
                  className="flex-1"
                  containerClassName="items-center justify-center flex-1"
                >
                  <Text className="text-black font-bold text-lg">
                    {t("scenarios_screen.create_modal.start_button")}
                  </Text>
                </RainbowBorder>
              </TouchableOpacity>
            </View>
            </>
            )}
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
