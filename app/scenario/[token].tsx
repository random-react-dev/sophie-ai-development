import { RainbowBorder } from "@/components/common/Rainbow";
import { Scenario } from "@/constants/scenarios";
import { getSharedScenario } from "@/services/supabase/scenarios";
import { useScenarioStore } from "@/stores/scenarioStore";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  MessageSquare,
  Sparkles,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SharedScenarioScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { addCustomScenario, selectScenario, customScenarios } =
    useScenarioStore();

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid share link");
      setIsLoading(false);
      return;
    }

    const fetchScenario = async () => {
      const result = await getSharedScenario(token);
      if (result) {
        setScenario(result);
      } else {
        setError("Scenario not found or this link is no longer valid.");
      }
      setIsLoading(false);
    };

    fetchScenario();
  }, [token]);

  const handleAddAndStart = () => {
    if (!scenario) return;

    const alreadyImported = customScenarios.some(
      (s) => s.shareToken === scenario.shareToken,
    );

    if (!alreadyImported) {
      addCustomScenario(scenario);
    }

    selectScenario(scenario);
    router.replace("/(tabs)/talk" as never);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background">
        {/* Loading */}
        {isLoading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-500 mt-4 font-medium">
              Loading scenario...
            </Text>
          </View>
        )}

        {/* Error */}
        {!isLoading && error && (
          <View className="flex-1 items-center justify-center px-8">
            <Sparkles size={48} color="#9ca3af" />
            <Text className="text-gray-900 text-xl font-bold mt-4 text-center">
              Oops!
            </Text>
            <Text className="text-gray-500 text-center mt-2 font-medium">
              {error}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace("/(tabs)/scenarios" as never)}
              className="mt-6 px-8 py-3 rounded-full bg-gray-100"
            >
              <Text className="text-gray-900 font-bold">Browse Scenarios</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scenario Preview */}
        {!isLoading && scenario && (
          <View className="flex-1 px-4 pt-8">
            <Text className="text-2xl font-bold text-black text-center mb-2">
              Shared Scenario
            </Text>
            <Text className="text-gray-400 text-center mb-8 font-medium">
              Someone shared a conversation scenario with you
            </Text>

            {/* Preview Card */}
            <View className="bg-surface rounded-2xl p-6 shadow-lg mb-8">
              <Text className="text-xl font-bold text-black mb-1">
                {scenario.title}
              </Text>
              <Text className="text-sm text-gray-400 font-medium mb-4">
                {scenario.category} · {scenario.level}
              </Text>
              <Text className="text-gray-600 mb-6 font-medium">
                {scenario.description}
              </Text>

              <View className="flex-row items-start mb-3">
                <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-3 mt-0.5">
                  <MessageSquare size={16} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 font-medium mb-0.5">
                    Sophie&apos;s Role
                  </Text>
                  <Text className="text-sm text-gray-900 font-medium">
                    {scenario.sophieRole}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3 mt-0.5">
                  <User size={16} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 font-medium mb-0.5">
                    Your Role
                  </Text>
                  <Text className="text-sm text-gray-900 font-medium">
                    {scenario.userRole}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAddAndStart}
              className="h-16 rounded-full overflow-hidden shadow-lg"
            >
              <RainbowBorder
                borderWidth={2}
                borderRadius={9999}
                className="flex-1"
                containerClassName="items-center justify-center flex-1"
              >
                <Text className="text-black font-bold text-lg">
                  Add &amp; Start Conversation
                </Text>
              </RainbowBorder>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
