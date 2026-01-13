import { useOnboardingStore } from "@/stores/onboardingStore";
import { BarChart2, Calendar, CheckCircle2, Target } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

export const CompletionStep = () => {
  const { data } = useOnboardingStore();

  const summaries = [
    { label: "Primary Goal", value: data.mainGoal, icon: Target },
    { label: "Learning Pace", value: data.fluencySpeed, icon: Calendar },
    { label: "Current Level", value: data.speakingLevel, icon: BarChart2 },
  ];

  return (
    <View className="flex-1 px-6 items-center">
      <View className="mb-10 items-center">
        <View className="w-24 h-24 bg-blue-100 items-center justify-center rounded-3xl mb-6 mt-4 rotate-6">
          <CheckCircle2 size={48} color="#3B82F6" />
        </View>
        <Text className="text-4xl font-bold text-gray-900 text-center mb-2">
          You&apos;re all set 🎉
        </Text>
        <Text className="text-gray-500 text-lg text-center px-4 leading-7">
          Your personal learning journey has been crafted based on your
          preferences.
        </Text>
      </View>

      <View className="w-full space-y-4">
        {summaries.map((item, i) => (
          <View
            key={i}
            className="bg-white p-5 rounded-3xl flex-row items-center border border-gray-100"
          >
            <View className="w-12 h-12 bg-gray-50 items-center justify-center rounded-2xl mr-4">
              <item.icon size={24} color="#3B82F6" />
            </View>
            <View>
              <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
                {item.label}
              </Text>
              <Text className="text-lg font-bold text-gray-900 capitalize">
                {item.value || "Not set"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
