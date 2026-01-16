import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Animated Checkbox with smooth "drawing" animation
function AnimatedCheckbox({ isChecked }: { isChecked: boolean }) {
  const progress = useSharedValue(isChecked ? 1 : 0);
  const pathLength = 22;

  useEffect(() => {
    progress.value = withTiming(isChecked ? 1 : 0, {
      duration: 300,
    });
  }, [isChecked]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: interpolate(progress.value, [0, 1], [pathLength, 0]),
    };
  });

  const bgAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["transparent", "#3b82f6"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#d1d5db", "#3b82f6"]
      ),
      borderWidth: 2,
    };
  });

  return (
    <Animated.View
      style={bgAnimatedStyle}
      className="w-6 h-6 rounded-full items-center justify-center"
    >
      <Svg width="14" height="14" viewBox="0 0 24 24">
        <AnimatedPath
          d="M5 12l5 5L20 7"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          animatedProps={animatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

// Dot Pattern Component - shows intensity level with dots
function DotPattern({ level }: { level: number }) {
  // Common dot style
  const containerStyle =
    "size-12 items-center justify-center rounded-full bg-blue-50";

  // Helper component to ensure perfect circles
  // Fixed size-2 for all dots as requested
  const Dot = () => (
    <View className="bg-blue-600 size-2" style={{ borderRadius: 100 }} />
  );

  const renderDots = () => {
    switch (level) {
      case 1:
        // Single dot in center
        return (
          <View className={containerStyle}>
            <Dot />
          </View>
        );
      case 2:
        // Two dots horizontal
        return (
          <View className={`${containerStyle} flex-row gap-1`}>
            <Dot />
            <Dot />
          </View>
        );
      case 3:
        // Three dots - 1 on top, 2 on bottom (triangle)
        return (
          <View className={containerStyle}>
            <View className="mb-0.5">
              <Dot />
            </View>
            <View className="flex-row gap-0.5">
              <Dot />
              <Dot />
            </View>
          </View>
        );
      case 4:
        // Four dots - square pattern
        return (
          <View className={containerStyle}>
            <View className="flex-row gap-0.5">
              <Dot />
              <Dot />
            </View>
            <View className="flex-row gap-0.5 mt-0.5">
              <Dot />
              <Dot />
            </View>
          </View>
        );
      case 5:
        // Five dots - dice pattern (2-1-2)
        return (
          <View className={containerStyle}>
            <View className="flex-row gap-0.5">
              <Dot />
              <Dot />
            </View>
            <View className="my-0.5">
              <Dot />
            </View>
            <View className="flex-row gap-0.5">
              <Dot />
              <Dot />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return renderDots();
}

interface SelectionCardProps {
  title: string;
  selected: boolean;
  onSelect: () => void;
  emoji?: string;
  description?: string;
  dotLevel?: number;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  selected,
  onSelect,
  emoji,
  description,
  dotLevel,
}) => {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#ffffff", "#f8fbff"]
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#e5e7eb", "#3b82f6"]
      ),
      shadowColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#000000", "#3b82f6"]
      ),
      shadowOpacity: interpolate(progress.value, [0, 1], [0.05, 0.08]),
      shadowRadius: interpolate(progress.value, [0, 1], [4, 8]),
      elevation: interpolate(progress.value, [0, 1], [1, 2]),
    };
  });

  return (
    <Pressable onPress={onSelect}>
      <Animated.View
        style={[
          animatedStyle,
          { borderWidth: 1.5, borderRadius: 20, padding: 16, marginBottom: 12 },
        ]}
        className="flex-row items-center"
      >
        {dotLevel && (
          <View className="mr-4">
            <DotPattern level={dotLevel} />
          </View>
        )}
        {emoji && !dotLevel && <Text className="text-3xl mr-4">{emoji}</Text>}
        <View className="flex-1 justify-center py-1">
          <Text
            className={`font-bold text-base ${
              selected ? "text-blue-500" : "text-gray-900"
            }`}
          >
            {title}
          </Text>
          {description && (
            <Text className="text-gray-500 text-sm mt-0.5">{description}</Text>
          )}
        </View>
        <View className="ml-4">
          <AnimatedCheckbox isChecked={selected} />
        </View>
      </Animated.View>
    </Pressable>
  );
};
