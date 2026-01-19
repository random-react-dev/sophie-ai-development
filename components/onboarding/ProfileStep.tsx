import { AuthInput } from "@/components/auth/AuthInput";
import CircleFlag from "@/components/common/CircleFlag";
import { RainbowGradient } from "@/components/common/Rainbow";
import { APP_LANGUAGES, Language } from "@/constants/languages";
import { Colors } from "@/constants/theme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { Ionicons } from "@expo/vector-icons";
import { ChevronDown } from "lucide-react-native";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Animated Checkbox with full Rainbow gradient when checked (same as SelectionCard)
function AnimatedCheckbox({ isChecked }: { isChecked: boolean }) {
  const progress = useSharedValue(isChecked ? 1 : 0);
  const pathLength = 22;

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

  const scaleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.1]) }],
    };
  });

  return (
    <Animated.View
      style={scaleStyle}
      className="w-6 h-6 rounded-full items-center justify-center overflow-hidden"
    >
      {isChecked ? (
        // Full rainbow gradient circle when checked
        <Svg width="24" height="24" viewBox="0 0 24 24">
          <Defs>
            <LinearGradient
              id="checkGradProfile"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {Colors.rainbow.map((color, index) => (
                <Stop
                  key={color}
                  offset={`${(index * 100) / (Colors.rainbow.length - 1)}%`}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Circle cx="12" cy="12" r="12" fill="url(#checkGradProfile)" />
        </Svg>
      ) : (
        // Gray border circle when unchecked
        <View className="w-6 h-6 rounded-full border-2 border-gray-300" />
      )}
      {/* Checkmark - always visible when checked */}
      {isChecked && (
        <View className="absolute">
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
        </View>
      )}
    </Animated.View>
  );
}

// Animated Language Item Component (same design as SelectionCard with rainbow border)
function LanguageItem({
  lang,
  isSelected,
  onPress,
}: {
  lang: Language;
  isSelected: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isSelected ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          animatedStyle,
          {
            borderRadius: 20,
            overflow: "hidden",
          },
        ]}
      >
        {/* Layer 1: Rainbow Background (Only visible when selected) */}
        {isSelected && (
          <View className="absolute inset-0">
            <RainbowGradient className="flex-1" />
          </View>
        )}

        {/* Layer 2: Main Content Container */}
        <View
          style={{
            margin: isSelected ? 2 : 0,
            borderRadius: isSelected ? 18 : 20,
            backgroundColor: "#ffffff",
            borderWidth: isSelected ? 0 : 1.5,
            borderColor: "#e5e7eb",
          }}
          className="flex-row items-center p-4"
        >
          <CircleFlag countryCode={lang.countryCode} size={40} />
          <View className="flex-1 ml-4">
            <Text className="font-bold text-base text-gray-900">
              {lang.name}
            </Text>
            <Text className="text-gray-500 text-sm">{lang.nativeName}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Countries list with countryCode for CircleFlag
interface Country {
  name: string;
  countryCode: string;
}

const COUNTRIES: Country[] = [
  { name: "Australia", countryCode: "au" },
  { name: "Brazil", countryCode: "br" },
  { name: "Canada", countryCode: "ca" },
  { name: "China", countryCode: "cn" },
  { name: "France", countryCode: "fr" },
  { name: "Germany", countryCode: "de" },
  { name: "India", countryCode: "in" },
  { name: "Indonesia", countryCode: "id" },
  { name: "Italy", countryCode: "it" },
  { name: "Japan", countryCode: "jp" },
  { name: "Mexico", countryCode: "mx" },
  { name: "Netherlands", countryCode: "nl" },
  { name: "Russia", countryCode: "ru" },
  { name: "Saudi Arabia", countryCode: "sa" },
  { name: "South Korea", countryCode: "kr" },
  { name: "Spain", countryCode: "es" },
  { name: "Switzerland", countryCode: "ch" },
  { name: "Turkey", countryCode: "tr" },
  { name: "United Kingdom", countryCode: "gb" },
  { name: "United States", countryCode: "us" },
];

// Animated Country Item Component (same design as LanguageItem)
function CountryItem({
  country,
  isSelected,
  onPress,
}: {
  country: Country;
  isSelected: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isSelected ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
    };
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          animatedStyle,
          {
            borderRadius: 20,
            overflow: "hidden",
          },
        ]}
      >
        {/* Layer 1: Rainbow Background (Only visible when selected) */}
        {isSelected && (
          <View className="absolute inset-0">
            <RainbowGradient className="flex-1" />
          </View>
        )}

        {/* Layer 2: Main Content Container */}
        <View
          style={{
            margin: isSelected ? 2 : 0,
            borderRadius: isSelected ? 18 : 20,
            backgroundColor: "#ffffff",
            borderWidth: isSelected ? 0 : 1.5,
            borderColor: "#e5e7eb",
          }}
          className="flex-row items-center p-4"
        >
          <CircleFlag countryCode={country.countryCode} size={40} />
          <View className="flex-1 ml-4">
            <Text className="font-bold text-base text-gray-900">
              {country.name}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Export interface for parent component to access sub-step state
export interface ProfileStepRef {
  subStep: number;
  goToNextSubStep: () => boolean; // Returns true if can advance, false if should advance main step
  goToPrevSubStep: () => boolean; // Returns true if went back, false if should go back main step
}

// Props interface for scroll state callback
interface ProfileStepProps {
  onScrollStateChange?: (showBorder: boolean) => void;
}

export const ProfileStep = forwardRef<ProfileStepRef, ProfileStepProps>(
  ({ onScrollStateChange }, ref) => {
    const { data, updateData } = useOnboardingStore();
    const [subStep, setSubStep] = useState(1);

    // State for Native Language modal (must be at top, before any returns)
    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    // State for Country modal
    const [countryModalVisible, setCountryModalVisible] = useState(false);

    // Scroll tracking refs
    const contentHeightRef = React.useRef(0);
    const containerHeightRef = React.useRef(0);

    // Get selected language display name
    const getSelectedLanguageName = () => {
      const lang = APP_LANGUAGES.find((l) => l.code === data.nativeLanguage);
      return lang ? lang.name : "Select your native language";
    };

    // Expose sub-step controls to parent
    useImperativeHandle(ref, () => ({
      subStep,
      goToNextSubStep: () => {
        if (subStep === 1 && data.preferredLanguage) {
          setSubStep(2);
          return true;
        }
        return false;
      },
      goToPrevSubStep: () => {
        if (subStep === 2) {
          setSubStep(1);
          return true;
        }
        return false;
      },
    }));

    // Sub-step 1: App Language Selection
    if (subStep === 1) {
      return (
        <View className="flex-1">
          <View className="mb-6 px-4">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Choose Your App Language
            </Text>
          </View>

          <FlatList
            data={APP_LANGUAGES}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{
              paddingTop: 4,
              paddingBottom: 100,
              paddingHorizontal: 16,
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const scrollY = event.nativeEvent.contentOffset.y;
              const isScrollable =
                contentHeightRef.current > containerHeightRef.current;
              const isAtBottom =
                scrollY + containerHeightRef.current >=
                contentHeightRef.current - 10;
              onScrollStateChange?.(isScrollable && !isAtBottom);
            }}
            onContentSizeChange={(width, height) => {
              contentHeightRef.current = height;
            }}
            onLayout={(event) => {
              containerHeightRef.current = event.nativeEvent.layout.height;
              // Initial check
              const isScrollable =
                contentHeightRef.current > containerHeightRef.current;
              onScrollStateChange?.(isScrollable);
            }}
            renderItem={({ item }) => (
              <LanguageItem
                lang={item}
                isSelected={data.preferredLanguage === item.code}
                onPress={() => updateData({ preferredLanguage: item.code })}
              />
            )}
          />
        </View>
      );
    }

    // Sub-step 2: Profile Details (Name, Country, Native Language)
    return (
      <View className="flex-1">
        <View className="mb-6 px-4">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Almost there!
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Your Name
            </Text>
            <AuthInput
              placeholder="Enter your name"
              value={data.name}
              onChangeText={(text) => updateData({ name: text })}
              autoCapitalize="words"
            />
          </View>

          {/* Country */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Country
            </Text>
            <TouchableOpacity
              className="flex-row items-center justify-between w-full bg-white rounded-full px-4 h-14 border border-gray-300"
              onPress={() => setCountryModalVisible(true)}
            >
              <Text
                className={`flex-1 text-base ${
                  data.country ? "text-gray-800" : "text-gray-400"
                }`}
                numberOfLines={1}
              >
                {data.country || "Select your country"}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Native Language */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Native Language
            </Text>
            <TouchableOpacity
              className="flex-row items-center justify-between w-full bg-white rounded-full px-4 h-14 border border-gray-300"
              onPress={() => setLanguageModalVisible(true)}
            >
              <Text
                className={`flex-1 text-base ${
                  data.nativeLanguage ? "text-gray-800" : "text-gray-400"
                }`}
                numberOfLines={1}
              >
                {getSelectedLanguageName()}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Country Modal */}
        <Modal
          visible={countryModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setCountryModalVisible(false)}
        >
          <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="px-4 py-6 bg-white border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 pr-4">
                    <Text className="text-2xl font-bold text-gray-900">
                      Select Country
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setCountryModalVisible(false)}
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons name="close" size={24} color="black" />
                  </Pressable>
                </View>
              </View>

              {/* Country List */}
              <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item.name}
                contentContainerStyle={{
                  paddingTop: 16,
                  paddingHorizontal: 16,
                  paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View className="h-3" />}
                renderItem={({ item }) => (
                  <CountryItem
                    country={item}
                    isSelected={data.country === item.name}
                    onPress={() => {
                      updateData({ country: item.name });
                      setCountryModalVisible(false);
                    }}
                  />
                )}
              />
            </SafeAreaView>
          </View>
        </Modal>

        {/* Native Language Modal */}
        <Modal
          visible={languageModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="px-4 py-6 bg-white border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 pr-4">
                    <Text className="text-2xl font-bold text-gray-900">
                      Native Language
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setLanguageModalVisible(false)}
                    className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                  >
                    <Ionicons name="close" size={24} color="black" />
                  </Pressable>
                </View>
              </View>

              {/* Language List */}
              <FlatList
                data={APP_LANGUAGES}
                keyExtractor={(item) => item.code}
                contentContainerStyle={{
                  paddingTop: 16,
                  paddingHorizontal: 16,
                  paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View className="h-3" />}
                renderItem={({ item }) => (
                  <LanguageItem
                    lang={item}
                    isSelected={data.nativeLanguage === item.code}
                    onPress={() => {
                      updateData({ nativeLanguage: item.code });
                      setLanguageModalVisible(false);
                    }}
                  />
                )}
              />
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    );
  }
);
