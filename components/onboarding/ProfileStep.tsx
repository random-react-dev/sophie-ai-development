import { AuthInput } from "@/components/auth/AuthInput";
import CircleFlag from "@/components/common/CircleFlag";
import { RainbowBorder } from "@/components/common/Rainbow";
import { APP_LANGUAGES, Language } from "@/constants/languages";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguageStore } from "@/stores/languageStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { Ionicons } from "@expo/vector-icons";
import { ChevronDown } from "lucide-react-native";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Language Item Component (simplified to prevent jerky modal animation)
// Uses RainbowBorder like CountryPicker.tsx for smooth modal transitions
function LanguageItem({
  lang,
  isSelected,
  onPress,
}: {
  lang: Language;
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <CircleFlag countryCode={lang.countryCode} size={40} />
      <View className="flex-1 ml-4">
        <Text className="font-bold text-base text-gray-900">{lang.name}</Text>
        <Text className="text-gray-500 text-sm">{lang.nativeName}</Text>
      </View>
    </>
  );

  return (
    <Pressable onPress={onPress}>
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

// Country Item Component (simplified to prevent jerky modal animation)
// Uses RainbowBorder like CountryPicker.tsx for smooth modal transitions
function CountryItem({
  country,
  isSelected,
  onPress,
}: {
  country: Country;
  isSelected: boolean;
  onPress: () => void;
}) {
  const Content = () => (
    <>
      <CircleFlag countryCode={country.countryCode} size={40} />
      <View className="flex-1 ml-4">
        <Text className="font-bold text-base text-gray-900">
          {country.name}
        </Text>
      </View>
    </>
  );

  return (
    <Pressable onPress={onPress}>
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
    const { t } = useTranslation();
    const { currentLanguage, setLanguage } = useLanguageStore();
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
        if (subStep === 1 && currentLanguage) {
          setSubStep(2);
          return true;
        }
        if (subStep === 2 && data.learningLanguage) {
          setSubStep(3);
          return true;
        }
        return false;
      },
      goToPrevSubStep: () => {
        if (subStep === 3) {
          setSubStep(2);
          return true;
        }
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
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {t("onboarding.chooseLanguage")}
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
                isSelected={currentLanguage === item.code}
                onPress={() => {
                  setLanguage(item.code);
                }}
              />
            )}
          />
        </View>
      );
    }

    // Sub-step 2: Learning Language Selection
    if (subStep === 2) {
      return (
        <View className="flex-1">
          <View className="mb-6 px-4">
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {t("onboarding.chooseLearningLanguage")}
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
                isSelected={data.learningLanguage === item.code}
                onPress={() => {
                  updateData({ learningLanguage: item.code });
                }}
              />
            )}
          />
        </View>
      );
    }

    // Sub-step 3: Profile Details (Name, Country, Native Language)
    return (
      <View className="flex-1">
        <View className="mb-6 px-4">
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t("onboarding.profileStep.almostThere")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              {t("onboarding.profileStep.nameLabel")}
            </Text>
            <AuthInput
              placeholder={t("onboarding.profileStep.namePlaceholder")}
              value={data.name}
              onChangeText={(text) => updateData({ name: text })}
              autoCapitalize="words"
            />
          </View>

          {/* Country */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              {t("onboarding.profileStep.countryLabel")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between w-full bg-white rounded-full px-4 h-14 border border-gray-300"
              onPress={() => setCountryModalVisible(true)}
            >
              <Text
                className={`flex-1 text-sm ${
                  data.country ? "text-gray-800" : "text-gray-400"
                }`}
                numberOfLines={1}
              >
                {data.country || t("onboarding.profileStep.countryPlaceholder")}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Native Language */}
          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              {t("onboarding.profileStep.nativeLanguageLabel")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex-row items-center justify-between w-full bg-white rounded-full px-4 h-14 border border-gray-300"
              onPress={() => setLanguageModalVisible(true)}
            >
              <Text
                className={`flex-1 text-sm ${
                  data.nativeLanguage ? "text-gray-800" : "text-gray-400"
                }`}
                numberOfLines={1}
              >
                {data.nativeLanguage
                  ? getSelectedLanguageName()
                  : t("onboarding.profileStep.nativeLanguagePlaceholder")}
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
                    <Text className="text-xl font-bold text-gray-900">
                      {t("onboarding.profileStep.selectCountry")}
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
                    <Text className="text-xl font-bold text-gray-900">
                      {t("onboarding.profileStep.selectNativeLanguage")}
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
  },
);

ProfileStep.displayName = "ProfileStep";
