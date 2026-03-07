import { RainbowBorder, RainbowGradient } from "@/components/common/Rainbow";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { Check, Crown } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Feature check item
function FeatureCheck({
  text,
  isScf = false,
}: {
  text: string;
  isScf?: boolean;
}) {
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

export default function SubscriptionScreen() {
  const { t } = useTranslation();

  // Track selected duration for the SBB plan
  const [sbbDuration, setSbbDuration] = useState<
    "6mo" | "12mo" | "18mo" | "24mo"
  >("12mo");

  // Dynamic details for SBB based on selected duration
  const getSbbDetails = () => {
    switch (sbbDuration) {
      case "6mo":
        return {
          price: "$10",
          billedText: t("profile.subscription_screen.common.billedEvery", {
            total: "$60",
            months: "6",
          }),
          discountBadge: t("profile.subscription_screen.common.saveVsMonthly", {
            percent: "50",
          }),
        };
      case "18mo":
        return {
          price: "$8",
          billedText: t("profile.subscription_screen.common.billedEvery", {
            total: "$144",
            months: "18",
          }),
          discountBadge: t("profile.subscription_screen.common.saveVsMonthly", {
            percent: "60",
          }),
        };
      case "24mo":
        return {
          price: "$7",
          billedText: t("profile.subscription_screen.common.billedEvery", {
            total: "$168",
            months: "24",
          }),
          discountBadge: t("profile.subscription_screen.common.saveVsMonthly", {
            percent: "65",
          }),
        };
      case "12mo":
      default:
        return {
          price: "$9",
          billedText: t("profile.subscription_screen.common.billedEvery", {
            total: "$108",
            months: "12",
          }),
          discountBadge: t("profile.subscription_screen.common.saveVsMonthly", {
            percent: "55",
          }),
        };
    }
  };

  const sbbDetails = getSbbDetails();

  const PLANS = [
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
      price: "$20",
      launchPrice: "$14",
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
      price: sbbDetails.price, // Dynamically driven by state
      duration: t("profile.subscription_screen.common.month"),
      billedText: sbbDetails.billedText, // Dynamically driven by state
      discountBadge: sbbDetails.discountBadge, // Dynamically driven by state
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

  const renderPlanCard = (plan: (typeof PLANS)[0]) => {
    const isScf = plan.id === "scf";
    const isSbb = plan.id === "pro";

    const cardContent = (
      <View className="p-6 relative">
        {/* Top Right Badges */}
        {plan.badge && isScf && (
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
        {plan.badge && isSbb && (
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
          {isScf ? (
            <View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-[40px] leading-[48px] font-black text-gray-900">
                  {plan.launchPrice}
                </Text>
                <Text className="text-gray-900 font-normal text-base">
                  / {plan.duration}{" "}
                  {t("profile.subscription_screen.common.launchPrice")}
                </Text>
              </View>
              <Text className="text-gray-500 font-normal mt-1">
                <Text className="line-through">{plan.price}</Text>/
                {plan.duration}{" "}
                {t("profile.subscription_screen.common.regularPrice")}
              </Text>
            </View>
          ) : (
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
          )}

          {/* SBB Discount Badge */}
          {plan.discountBadge && (
            <View className="flex-row mt-3">
              <RainbowBorder
                borderRadius={9999}
                borderWidth={1.5}
                containerClassName="bg-white px-3 py-2 items-center justify-center flex-row"
              >
                <Text
                  className="text-gray-800 font-medium text-sm"
                  style={{ includeFontPadding: false }}
                >
                  {plan.discountBadge}
                </Text>
              </RainbowBorder>
            </View>
          )}

          {/* SBB Duration Toggles */}
          {isSbb && (
            <View className="flex-row flex-wrap items-center gap-3 mt-4">
              {(["6mo", "12mo", "18mo", "24mo"] as const).map((duration) => {
                const isActive = sbbDuration === duration;
                const label = `${duration.replace("mo", "")} ${t("profile.subscription_screen.common.mo")}`;

                if (isActive) {
                  return (
                    <TouchableOpacity
                      key={duration}
                      activeOpacity={0.8}
                      onPress={() => setSbbDuration(duration)}
                    >
                      <RainbowBorder
                        borderRadius={9999}
                        borderWidth={1.5}
                        containerClassName="bg-white"
                        style={{ minWidth: 60 }}
                      >
                        <View className="px-3 py-2 items-center justify-center">
                          <Text
                            className="text-xs font-medium text-gray-800"
                            style={{ includeFontPadding: false }}
                          >
                            {label}
                          </Text>
                        </View>
                      </RainbowBorder>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    key={duration}
                    activeOpacity={0.8}
                    onPress={() => setSbbDuration(duration)}
                    className="rounded-full border border-gray-200 bg-white"
                    style={{ minWidth: 60 }}
                  >
                    <View className="px-3 py-2 items-center justify-center">
                      <Text
                        className="text-xs font-medium text-gray-700"
                        style={{ includeFontPadding: false }}
                      >
                        {label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Features List */}
        <View className="mb-6 flex-1 mt-2">
          {plan.features.map((feature, idx) => (
            <FeatureCheck
              key={`feat-${plan.id}-${idx}`}
              text={feature}
              isScf={isScf}
            />
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
        <View className="px-6 py-10 items-center">
          <RainbowGradient className="w-20 h-20 rounded-3xl items-center justify-center mb-4">
            <Crown size={36} color="white" />
          </RainbowGradient>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            {t("profile.subscription_screen.choosePlan")}
          </Text>
          <Text className="text-base text-gray-500 text-center mt-2 px-6">
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
