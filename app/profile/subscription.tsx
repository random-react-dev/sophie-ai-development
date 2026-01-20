import { RainbowBorder, RainbowGradient } from "@/components/common/Rainbow";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useRouter } from "expo-router";
import { Check, Crown } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Feature check item with rainbow border
function FeatureCheck({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-3 mb-3">
      {/* Checkmark with rainbow border */}
      <RainbowBorder
        borderRadius={9999}
        borderWidth={1.5}
        className="w-5 h-5"
        containerClassName="items-center justify-center"
      >
        <Check size={10} color="black" strokeWidth={3} />
      </RainbowBorder>
      <Text className="text-gray-700 text-sm font-medium flex-1">{text}</Text>
    </View>
  );
}

const PLANS = [
  {
    id: "free",
    name: "Free Trial",
    price: "$0",
    duration: "7 days",
    features: [
      "All languages included",
      "5 min/day practice",
      "Basic AI tutor feedback",
    ],
    emoji: "🎁",
    isFeatured: false,
  },
  {
    id: "launch",
    name: "Launch Pack",
    price: "$4.99",
    duration: "month",
    features: [
      "1 language of choice",
      "15 min/day practice",
      "Priority AI feedback",
      "No ads",
    ],
    emoji: "🚀",
    isFeatured: true,
    badge: "Most Popular",
  },
  {
    id: "pro",
    name: "Unlimited",
    price: "$19",
    duration: "month",
    features: [
      "Unlimited languages",
      "Unlimited time",
      "Advanced AI analytics",
      "Personalized paths",
    ],
    emoji: "👑",
    isFeatured: false,
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();

  const renderPlanCard = (plan: (typeof PLANS)[0]) => {
    const cardContent = (
      <View className="p-6">
        {/* Badge for featured plan */}
        {plan.badge && (
          <View className="absolute top-0 right-0 overflow-hidden rounded-bl-2xl">
            <View className="px-4 py-2 relative overflow-hidden">
              {/* Subtle rainbow gradient background */}
              <View className="absolute inset-0">
                <RainbowGradient className="flex-1 opacity-20" />
              </View>
              <Text className="text-black text-[10px] font-bold uppercase tracking-wider">
                {plan.badge}
              </Text>
            </View>
          </View>
        )}

        {/* Plan Header - Emoji + Name + Price */}
        <View className="flex-row items-center gap-4 mb-6">
          {/* Emoji */}
          <RainbowBorder
            borderRadius={16}
            borderWidth={1.5}
            className="size-12"
            containerClassName="items-center justify-center"
          >
            <Text className="text-2xl">{plan.emoji}</Text>
          </RainbowBorder>

          {/* Plan Name & Price */}
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 mb-0.5">
              {plan.name}
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-black text-gray-900">
                {plan.price}
              </Text>
              <Text className="text-gray-500 text-sm font-medium ml-1">
                /{plan.duration}
              </Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View className="mb-5">
          {plan.features.map((feature, idx) => (
            <FeatureCheck key={idx} text={feature} />
          ))}
        </View>

        {/* CTA Button */}
        {plan.isFeatured ? (
          <RainbowBorder
            borderRadius={9999}
            borderWidth={2}
            className="h-14"
            containerClassName="items-center justify-center"
          >
            <Text className="text-black font-bold text-base">
              Subscribe Now
            </Text>
          </RainbowBorder>
        ) : (
          <View className="h-14 rounded-full items-center justify-center bg-gray-100">
            <Text className="text-gray-700 font-bold text-base">
              {plan.id === "free" ? "Get Started" : "Subscribe Now"}
            </Text>
          </View>
        )}
      </View>
    );

    // Wrap featured plan with RainbowBorder
    if (plan.isFeatured) {
      return (
        <TouchableOpacity
          key={plan.id}
          activeOpacity={1}
          className="mb-4 rounded-3xl overflow-hidden shadow-lg"
        >
          <RainbowBorder
            borderRadius={24}
            borderWidth={2}
            className="w-full"
            containerClassName="bg-white"
          >
            {cardContent}
          </RainbowBorder>
        </TouchableOpacity>
      );
    }

    // Regular plan card
    return (
      <TouchableOpacity
        key={plan.id}
        activeOpacity={1}
        className="mb-4 rounded-3xl bg-gray-50 border border-gray-100 shadow-sm overflow-hidden"
      >
        {cardContent}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ProfileHeader title="Upgrade to Pro" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <View className="px-6 py-8 items-center">
          <RainbowGradient className="w-20 h-20 rounded-3xl items-center justify-center mb-4">
            <Crown size={36} color="white" />
          </RainbowGradient>
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Choose Your Plan
          </Text>
          <Text className="text-base text-gray-500 text-center mt-2 px-4">
            Unlock the full potential of Sophie AI and master any language.
          </Text>
        </View>

        {/* Plan Cards */}
        <View className="px-4">
          {PLANS.map((plan) => renderPlanCard(plan))}
        </View>

        {/* Footer Note */}
        <View className="px-6 mt-4 items-center">
          <Text className="text-gray-400 text-xs text-center italic">
            All plans include 24/7 AI tutor access and Progress Tracking. Cancel
            anytime from your settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
