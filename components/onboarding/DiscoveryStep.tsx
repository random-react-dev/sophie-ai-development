import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  Instagram,
  MoreHorizontal,
  Search,
  Users,
  Youtube,
} from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";
import { SelectionCard } from "./SelectionCard";

export const DiscoveryStep = () => {
  const { data, updateData } = useOnboardingStore();

  const sources = [
    { id: "youtube", title: "YouTube", icon: Youtube },
    { id: "instagram", title: "Social Media", icon: Instagram },
    { id: "search", title: "Search Engine", icon: Search },
    { id: "friend", title: "Friend or Colleague", icon: Users },
    { id: "other", title: "Other", icon: MoreHorizontal },
  ];

  return (
    <View className="flex-1 px-6">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          How did you find us?
        </Text>
        <Text className="text-gray-500 text-base">
          This helps us reach more learners like you.
        </Text>
      </View>

      {sources.map((source) => (
        <SelectionCard
          key={source.id}
          title={source.title}
          icon={source.icon}
          selected={data.discoverySource === source.id}
          onSelect={() => updateData({ discoverySource: source.id })}
        />
      ))}
    </View>
  );
};
