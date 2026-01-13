import ProfileHeader from "@/components/profile/ProfileHeader";
import { useRouter } from "expo-router";
import { Check, Crown, Sparkles, Star, Zap } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    icon: <Sparkles size={24} color="#6b7280" />,
    bgColor: "bg-gray-50",
    borderColor: "border-gray-100",
    accentColor: "bg-gray-200",
    textColor: "text-gray-600",
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
    icon: <Zap size={24} color="#3b82f6" />,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    accentColor: "bg-blue-500",
    textColor: "text-blue-600",
    special: "Most Popular",
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
    icon: <Crown size={24} color="#f59e0b" />,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    accentColor: "bg-amber-500",
    textColor: "text-amber-600",
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ProfileHeader title="Upgrade to Pro" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 py-8 items-center">
          <View className="w-20 h-20 rounded-3xl bg-blue-50 items-center justify-center mb-4">
            <Star size={40} color="#3b82f6" fill="#3b82f6" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center">
            Choose Your Plan
          </Text>
          <Text className="text-base text-gray-500 text-center mt-2 px-4">
            Unlock the full potential of Sophie AI and master any language.
          </Text>
        </View>

        <View className="px-4 gap-6">
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.9}
              className={`relative rounded-3xl border-2 p-6 ${plan.bgColor} ${plan.borderColor} shadow-sm overflow-hidden`}
            >
              {!!plan.special && (
                <View className="absolute top-0 right-0 bg-blue-500 px-4 py-1.5 rounded-bl-2xl">
                  <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                    {plan.special}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center gap-4 mb-4">
                <View className="w-12 h-12 rounded-2xl items-center justify-center bg-white/50">
                  {plan.icon}
                </View>
                <View>
                  <Text className="text-lg font-bold text-gray-900">
                    {plan.name}
                  </Text>
                  <View className="flex-row items-baseline">
                    <Text className="text-2xl font-black text-gray-900">
                      {plan.price}
                    </Text>
                    <Text className="text-gray-500 text-sm font-medium">
                      /{plan.duration}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="gap-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-3">
                    <View
                      className={`w-5 h-5 rounded-full items-center justify-center ${plan.accentColor} bg-opacity-10`}
                    >
                      <Check
                        size={12}
                        color={
                          plan.id === "free"
                            ? "#6b7280"
                            : plan.id === "launch"
                            ? "#3b82f6"
                            : "#f59e0b"
                        }
                        strokeWidth={3}
                      />
                    </View>
                    <Text className="text-gray-700 text-sm font-medium">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <View
                className={`w-full py-4 rounded-2xl items-center ${plan.accentColor}`}
              >
                <Text className="text-white font-bold text-base">
                  {plan.id === "free" ? "Get Started" : "Subscribe Now"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-6 mt-8 items-center italic">
          <Text className="text-gray-400 text-xs text-center">
            All plans include 24/7 AI tutor access and Progress Tracking. Cancel
            anytime from your settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
