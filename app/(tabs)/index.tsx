import { Button } from '@/components/common/Button';
import { useGameStore } from '@/stores/gameStore';
import { Link, router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export default function HomeScreen() {
  const { streakCount, totalXp } = useGameStore();

  return (
    <ScrollView className="flex-1 bg-white px-6 py-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-3xl font-bold text-gray-900">Hola, User!</Text>
          <Text className="text-gray-500 text-lg">Ready to learn?</Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center space-x-1">
            <Text className="text-orange-500 font-bold text-xl">🔥 {streakCount}</Text>
          </View>
          <Text className="text-blue-500 font-bold text-sm">XP: {totalXp}</Text>
        </View>
      </View>

      {/* Lesson Path */}
      <View className="space-y-6">
        <Text className="text-xl font-bold text-gray-800">Unit 1: Introductions</Text>

        <View className="items-center space-y-4">
          {/* Simplified Lesson Node */}
          <Link href="/lesson/1" asChild>
            <Pressable className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/40">
              <Text className="text-white font-bold text-2xl">★</Text>
            </Pressable>
          </Link>
          <Text className="font-bold text-gray-700">Lesson 1</Text>
        </View>

        <View className="items-center space-y-4 opacity-50">
          <View className="w-20 h-20 bg-gray-300 rounded-full items-center justify-center">
            <Text className="text-white font-bold text-2xl">🔒</Text>
          </View>
          <Text className="font-bold text-gray-500">Lesson 2</Text>
        </View>
      </View>

      <View className="mt-12">
        <Button title="Practice Speaking" onPress={() => router.push('/lesson/practice')} />
      </View>

    </ScrollView>
  );
}
