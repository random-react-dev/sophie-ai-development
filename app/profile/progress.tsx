import ProfileHeader from "@/components/profile/ProfileHeader";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgressScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <ProfileHeader title="Progress" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Main Card Display */}
        {/* <View className="mx-4 mt-6">
                    <View className="bg-white rounded-2xl p-6 shadow-sm items-center">
                        <View className="w-16 h-16 rounded-2xl bg-green-50 items-center justify-center mb-4">
                            <BarChart3 size={32} color="#22c55e" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900">Progress</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            Track your learning journey
                        </Text>
                    </View>
                </View> */}

        {/* Stats Preview */}
        <View className="mx-4 mt-2">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Overview
          </Text>

          <View className="bg-surface rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between">
              <View className="flex-1 items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-2">
                  <Clock size={20} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">--</Text>
                <Text className="text-xs text-gray-500 mt-1">Hours</Text>
              </View>

              <View className="w-px bg-gray-100" />

              <View className="flex-1 items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center mb-2">
                  <BookOpen size={20} color="#22c55e" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">--</Text>
                <Text className="text-xs text-gray-500 mt-1">Lessons</Text>
              </View>

              <View className="w-px bg-gray-100" />

              <View className="flex-1 items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mb-2">
                  <Target size={20} color="#f59e0b" />
                </View>
                <Text className="text-2xl font-bold text-gray-900">--</Text>
                <Text className="text-xs text-gray-500 mt-1">Goals</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Coming Soon */}
        <View className="mx-4 mt-6">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
            Detailed Stats
          </Text>

          <View className="bg-surface rounded-2xl p-6 shadow-sm items-center">
            <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mb-3">
              <TrendingUp size={24} color="#9ca3af" />
            </View>
            <Text className="text-base font-semibold text-gray-900 mb-1">
              Coming Soon
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              Detailed learning analytics and progress tracking will be
              available in a future update.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
