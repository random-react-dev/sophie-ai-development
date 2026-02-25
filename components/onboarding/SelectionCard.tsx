import { RainbowGradient } from "@/components/common/Rainbow";
import { Colors } from "@/constants/theme";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Duration Ring Component with Rainbow gradient
// Fixed behavior:
// 1. On mount: ALL rings animate to their respective levels
// 2. After any selection: selected ring shows animated, others show STATIC at their level
function DurationRing({
  level,
  selected,
}: {
  level: number;
  selected?: boolean;
}) {
  const radius = 16;
  const strokeWidth = 3;
  const center = 22;
  const circumference = 2 * Math.PI * radius;

  const percentages = [0.15, 0.3, 0.5, 0.65, 0.85, 1];
  const targetPercentage = percentages[Math.min(level - 1, 5)];

  const progress = useSharedValue(0);
  const isMounted = React.useRef(false);

  useEffect(() => {
    if (selected || !isMounted.current) {
      // INITIAL MOUNT or SELECTION - animate to target
      isMounted.current = true;
      progress.value = 0; // Reset progress to 0 to re-trigger animation
      progress.value = withSpring(targetPercentage, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      // Stay at target level when unselected after first mount
      progress.value = withSpring(targetPercentage, {
        damping: 15,
        stiffness: 100,
      });
    }
  }, [targetPercentage, selected, progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View className="size-12 items-center justify-center rounded-full bg-gray-50">
      <Svg width="44" height="44" viewBox="0 0 44 44">
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            {Colors.rainbow.map((color, index) => (
              <Stop
                key={color}
                offset={`${(index * 100) / (Colors.rainbow.length - 1)}%`}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        {/* Background Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Ring with Rainbow Gradient */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          originX={center}
          originY={center}
          rotation="-90"
        />
      </Svg>
    </View>
  );
}

// Individual animated bar item - moved outside to properly use hooks
function AnimatedBar({
  barLevel,
  level,
  progress,
  index,
  barColors,
}: {
  barLevel: number;
  level: number;
  progress: SharedValue<number>;
  index: number;
  barColors: string[];
}) {
  const heightClass: Record<number, string> = {
    1: "h-[6px]",
    2: "h-[10px]",
    3: "h-[14px]",
    4: "h-[18px]",
    5: "h-[22px]",
  };

  const isActive = level >= barLevel;

  const barStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      progress.value,
      [index * 0.1, index * 0.1 + 0.5],
      [0, 1],
      "clamp",
    );
    return {
      transform: [{ scaleY: scale }],
      opacity: scale,
    };
  });

  return (
    <Animated.View
      key={barLevel}
      className={`w-1 rounded-full ${heightClass[barLevel]}`}
      style={[
        {
          backgroundColor: isActive ? barColors[barLevel - 1] : "#e5e7eb",
        },
        isActive ? barStyle : {},
      ]}
    />
  );
}

// Signal Bars Component with Rainbow colors
function SignalBars({
  level,
  selected,
}: {
  level: number;
  selected?: boolean;
}) {
  const bars = [1, 2, 3, 4, 5];
  // Use rainbow colors for active bars
  const barColors = ["#E81416", "#FFA500", "#FAEB36", "#79C314", "#487DE7"];

  const progress = useSharedValue(0);

  useEffect(() => {
    if (selected) {
      progress.value = 0;
      progress.value = withSpring(1, { damping: 15, stiffness: 100 });
    } else {
      progress.value = withSpring(1, { damping: 15, stiffness: 100 });
    }
  }, [selected, progress]);

  return (
    <View className="size-12 rounded-full bg-gray-50 items-center justify-center">
      <View className="flex-row items-end gap-0.5 h-6">
        {bars.map((barLevel, index) => (
          <AnimatedBar
            key={barLevel}
            barLevel={barLevel}
            level={level}
            progress={progress}
            index={index}
            barColors={barColors}
          />
        ))}
      </View>
    </View>
  );
}

// Dot Pattern Component with Rainbow gradient
function DotPattern({
  level,
  selected,
}: {
  level: number;
  selected?: boolean;
}) {
  const containerStyle =
    "size-12 items-center justify-center rounded-full bg-gray-50";

  const progress = useSharedValue(0);

  useEffect(() => {
    if (selected) {
      progress.value = 0;
      progress.value = withSpring(1, { damping: 15, stiffness: 100 });
    } else {
      progress.value = withSpring(1, { damping: 15, stiffness: 100 });
    }
  }, [selected, progress]);

  // Helper component to ensure perfect circles
  // Fixed size-2 for all dots as requested
  const Dot = ({ index }: { index: number }) => {
    const dotStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        progress.value,
        [index * 0.1, index * 0.1 + 0.5],
        [0, 1],
        "clamp",
      );
      return {
        transform: [{ scale }],
        opacity: scale,
      };
    });

    return (
      <Animated.View style={dotStyle}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            backgroundColor: "#1f2937", // gray-800
          }}
        />
      </Animated.View>
    );
  };

  const renderDots = () => {
    switch (level) {
      case 1:
        return (
          <View className={containerStyle}>
            <Dot index={0} />
          </View>
        );
      case 2:
        return (
          <View className={containerStyle}>
            <View className="flex-row gap-0.5">
              <Dot index={0} />
              <Dot index={1} />
            </View>
          </View>
        );
      case 3:
        return (
          <View className={containerStyle}>
            <View className="flex-col items-center gap-0.5">
              <Dot index={0} />
              <View className="flex-row gap-0.5">
                <Dot index={1} />
                <Dot index={2} />
              </View>
            </View>
          </View>
        );
      case 4:
        return (
          <View className={containerStyle}>
            <View className="flex-col gap-0.5">
              <View className="flex-row gap-0.5">
                <Dot index={0} />
                <Dot index={1} />
              </View>
              <View className="flex-row gap-0.5">
                <Dot index={2} />
                <Dot index={3} />
              </View>
            </View>
          </View>
        );
      case 5:
        return (
          <View className={containerStyle}>
            <View className="flex-col items-center gap-0.5">
              <Dot index={0} />
              <View className="flex-row gap-0.5">
                <Dot index={1} />
                <Dot index={2} />
              </View>
              <View className="flex-row gap-0.5">
                <Dot index={3} />
                <Dot index={4} />
              </View>
            </View>
          </View>
        );
      default:
        return (
          <View className={containerStyle}>
            <Dot index={0} />
          </View>
        );
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
  durationLevel?: number;
  proficiencyLevel?: number;
}

export function SelectionCard({
  title,
  selected,
  onSelect,
  emoji,
  description,
  dotLevel,
  durationLevel,
  proficiencyLevel,
}: SelectionCardProps) {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, {
      damping: 20,
      stiffness: 90,
    });
  }, [selected, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.02]) }],
    };
  });

  const CardContent = () => (
    <View className="flex-row items-center p-4">
      {durationLevel && (
        <View className="mr-4">
          <DurationRing level={durationLevel} selected={selected} />
        </View>
      )}
      {proficiencyLevel && (
        <View className="mr-4">
          <SignalBars level={proficiencyLevel} selected={selected} />
        </View>
      )}
      {dotLevel && !durationLevel && !proficiencyLevel && (
        <View className="mr-4">
          <DotPattern level={dotLevel} selected={selected} />
        </View>
      )}
      {emoji && !dotLevel && !durationLevel && !proficiencyLevel && (
        <Text className="text-3xl mr-4">{emoji}</Text>
      )}
      <View className="flex-1 justify-center py-1">
        <Text
          className={`font-bold text-base ${
            selected ? "text-gray-900" : "text-gray-900"
          }`}
        >
          {title}
        </Text>
        {description && (
          <Text className="text-gray-500 text-sm mt-0.5">{description}</Text>
        )}
      </View>
    </View>
  );

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            marginBottom: 12,
            borderRadius: 20,
            overflow: "hidden",
          },
        ]}
      >
        {/* Layer 1: Rainbow Background (Only visible when selected) */}
        {selected && (
          <View className="absolute inset-0">
            <RainbowGradient className="flex-1" />
          </View>
        )}

        {/* Layer 2: Main Content Container */}
        <View
          style={{
            margin: selected ? 2 : 0,
            borderRadius: selected ? 18 : 20,
            backgroundColor: "#ffffff",
            borderWidth: selected ? 0 : 1.5,
            borderColor: "#e5e7eb",
          }}
        >
          {CardContent()}
        </View>
      </Animated.View>
    </Pressable>
  );
}
