import { RainbowBorder } from "@/components/common/Rainbow";
import { RainbowWave } from "@/components/lesson/RainbowWave";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { Check } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Feature check item
function FeatureCheck({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-3 mb-3">
      <RainbowBorder
        borderRadius={9999}
        borderWidth={1.5}
        className="w-5 h-5"
        containerClassName="items-center justify-center mt-0.5"
      >
        <Check size={10} color="black" strokeWidth={2.5} />
      </RainbowBorder>
      <Text className="text-gray-600 text-sm font-normal flex-1 leading-5">
        {text}
      </Text>
    </View>
  );
}

type Plan = {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  badge?: string;
  billedText?: string;
  discountBadge?: string;
  features: string[];
  isFeatured: boolean;
};

export default function SubscriptionScreen() {
  const { t } = useTranslation();

  const PLANS: Plan[] = [
    {
      id: "free",
      name: t("profile.subscription_screen.plans.mg.name"),
      description: t("profile.subscription_screen.plans.mg.description"),
      price: "$0",
      duration: t("profile.subscription_screen.common.day7"),
      features: [
        t("profile.subscription_screen.plans.mg.features.0"),
        t("profile.subscription_screen.plans.mg.features.1"),
        t("profile.subscription_screen.plans.mg.features.2"),
        t("profile.subscription_screen.plans.mg.features.3"),
        t("profile.subscription_screen.plans.mg.features.4"),
      ],
      isFeatured: false,
    },
    {
      id: "scf",
      name: t("profile.subscription_screen.plans.scf.name"),
      description: t("profile.subscription_screen.plans.scf.description"),
      badge: t("profile.subscription_screen.plans.scf.badge"),
      price: "$8",
      duration: t("profile.subscription_screen.common.month"),
      features: [
        t("profile.subscription_screen.plans.scf.features.0"),
        t("profile.subscription_screen.plans.scf.features.1"),
        t("profile.subscription_screen.plans.scf.features.2"),
        t("profile.subscription_screen.plans.scf.features.3"),
      ],
      isFeatured: true,
    },
    {
      id: "pro",
      name: t("profile.subscription_screen.plans.sbb.name"),
      description: t("profile.subscription_screen.plans.sbb.description"),
      badge: t("profile.subscription_screen.plans.sbb.badge"),
      price: "$12",
      duration: t("profile.subscription_screen.common.sixMonths"),
      discountBadge: t("profile.subscription_screen.common.saveVsMonthly", {
        percent: "75",
      }),
      features: [
        t("profile.subscription_screen.plans.sbb.features.0"),
        t("profile.subscription_screen.plans.sbb.features.1"),
        t("profile.subscription_screen.plans.sbb.features.2"),
        t("profile.subscription_screen.plans.sbb.features.3"),
        t("profile.subscription_screen.plans.sbb.features.4"),
      ],
      isFeatured: false,
    },
  ];

  const renderPlanCard = (plan: Plan) => {
    const cardContent = (
      <View className="p-6 relative">
        {/* Top Right Badge */}
        {plan.badge && (
          <View className="absolute top-6 right-6 z-10 bg-white rounded-full">
            <RainbowBorder
              borderRadius={9999}
              borderWidth={1.5}
              containerClassName="px-3 py-2 bg-white"
            >
              <Text className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                {plan.badge}
              </Text>
            </RainbowBorder>
          </View>
        )}

        {/* Header */}
        <View className="mb-6 pt-2">
          <Text className="text-xl font-bold text-gray-900 mb-1">
            {plan.name}
          </Text>
          <Text className="text-sm text-gray-500">{plan.description}</Text>
        </View>

        {/* Pricing */}
        <View className="mb-6">
          <View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-[40px] leading-[48px] font-black text-gray-900">
                {plan.price}
              </Text>
              <Text className="text-gray-900 font-normal flex-grow text-base">
                / {plan.duration}
              </Text>
            </View>
            {plan.billedText && (
              <Text className="text-gray-500 font-normal mt-1">
                {plan.billedText}
              </Text>
            )}
          </View>
        </View>

        {/* Features List */}
        <View className="mb-6 flex-1 mt-2">
          {plan.features.map((feature, idx) => (
            <FeatureCheck key={`feat-${plan.id}-${idx}`} text={feature} />
          ))}
        </View>

        {/* CTA Button - Coming Soon */}
        <View className="mt-auto">
          <View className="w-full h-14 rounded-full bg-gray-100 items-center justify-center">
            <Text className="text-black font-bold text-base">Coming Soon</Text>
          </View>
        </View>
      </View>
    );

    if (plan.isFeatured) {
      return (
        <View key={plan.id} className="mb-6 shadow-xl shadow-red-500/10">
          <RainbowBorder
            borderRadius={24}
            borderWidth={2}
            className="w-full"
            containerClassName="bg-white"
          >
            {cardContent}
          </RainbowBorder>
        </View>
      );
    }

    return (
      <View
        key={plan.id}
        className="mb-6 rounded-3xl bg-white border border-gray-200 shadow-sm"
      >
        {cardContent}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ProfileHeader title={t("profile.subscription_screen.title")} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <View className="px-4 py-10 items-center">
          <View className="items-center justify-center h-16">
            <RainbowWave
              isListening={false}
              isSpeaking={false}
              isProcessing={false}
              width={120}
              height={40}
              amplitudeScale={3.5}
              static={true}
            />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            {t("profile.subscription_screen.choosePlan")}
          </Text>
          <Text className="text-base text-gray-500 text-center mt-2">
            {t("profile.subscription_screen.subtitle")}
          </Text>
        </View>

        {/* Plan Cards List */}
        <View className="px-4">
          {PLANS.map((plan) => renderPlanCard(plan))}
        </View>

        {/* Footer Text */}
        <View className="px-6 mt-4 items-center">
          <Text className="text-gray-400 text-xs text-center">
            {t("profile.subscription_screen.footer")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
