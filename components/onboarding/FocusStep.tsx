import { RainbowBorder } from "@/components/common/Rainbow";
import { useOnboardingStore } from "@/stores/onboardingStore";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FocusTagProps {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
}

const FocusTag: React.FC<FocusTagProps> = ({
  label,
  emoji,
  selected,
  onPress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(selected ? 1.02 : 1) }],
    };
  });

  if (selected) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable onPress={onPress}>
          <RainbowBorder
            borderRadius={100}
            borderWidth={2}
            style={{
              marginRight: 8,
              marginBottom: 12,
            }}
          >
            <View
              className="flex-row items-center"
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 8 }}>{emoji}</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                {label}
              </Text>
            </View>
          </RainbowBorder>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        animatedStyle,
        {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 100,
          borderWidth: 2,
          borderColor: "#e5e7eb",
          backgroundColor: "#ffffff",
          marginRight: 8,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
        },
      ]}
    >
      <Text style={{ fontSize: 20, marginRight: 8 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: "#374151",
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
};

export const FocusStep = () => {
  const { data, updateData } = useOnboardingStore();

  const areas = [
    { label: "Listening", emoji: "👂" },
    { label: "Speaking", emoji: "🗣️" },
    { label: "Pronunciation", emoji: "🎯" },
    { label: "Vocabulary", emoji: "📚" },
    { label: "Grammar", emoji: "📝" },
    { label: "Reading", emoji: "📖" },
    { label: "Writing", emoji: "✍️" },
  ];

  const toggleArea = (area: string) => {
    const current = data.focusAreas;
    if (current.includes(area)) {
      updateData({ focusAreas: current.filter((a) => a !== area) });
    } else {
      updateData({ focusAreas: [...current, area] });
    }
  };

  return (
    <View className="flex-1 px-4">
      <View className="flex-row flex-wrap">
        {areas.map((area) => (
          <FocusTag
            key={area.label}
            label={area.label}
            emoji={area.emoji}
            selected={data.focusAreas.includes(area.label)}
            onPress={() => toggleArea(area.label)}
          />
        ))}
      </View>
    </View>
  );
};
