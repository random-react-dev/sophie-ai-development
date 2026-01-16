import { useOnboardingStore } from "@/stores/onboardingStore";
import React, { useEffect } from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Confetti piece component
const ConfettiPiece: React.FC<{
  delay: number;
  startX: number;
  color: string;
  size: number;
}> = ({ delay, startX, color, size }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Fall animation
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: 3000 + Math.random() * 2000,
        easing: Easing.linear,
      })
    );

    // Sway animation
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(30, { duration: 500 }),
          withTiming(-30, { duration: 500 })
        ),
        -1,
        true
      )
    );

    // Rotation
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 1000 }), -1, false)
    );

    // Fade out at bottom
    opacity.value = withDelay(delay + 2500, withTiming(0, { duration: 500 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: startX,
          top: -20,
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 4,
        },
        animatedStyle,
      ]}
    />
  );
};

// Confetti burst component
const ConfettiBurst: React.FC = () => {
  const colors = [
    "#2563eb",
    "#60a5fa",
    "#fbbf24",
    "#f87171",
    "#34d399",
    "#a78bfa",
  ];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * SCREEN_WIDTH,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8,
  }));

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          startX={piece.startX}
          color={piece.color}
          size={piece.size}
        />
      ))}
    </View>
  );
};

interface SummaryCardProps {
  label: string;
  value: string;
  emoji: string;
  delay: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  emoji,
  delay,
}) => {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      className="bg-white p-4 rounded-3xl flex-row items-center border-2 border-blue-50 mb-3"
    >
      <View className="w-14 h-14 bg-blue-50 items-center justify-center rounded-2xl mr-4">
        <Text style={{ fontSize: 28 }}>{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
          {label}
        </Text>
        <Text className="text-lg font-bold text-gray-900 capitalize">
          {value || "Not set"}
        </Text>
      </View>
    </Animated.View>
  );
};

export const CompletionStep = () => {
  const { data } = useOnboardingStore();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
  }, []);

  const animatedEmojiStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const summaries = [
    { label: "Primary Goal", value: data.mainGoal, emoji: "🎯" },
    { label: "Learning Pace", value: data.fluencySpeed, emoji: "⚡" },
    { label: "Current Level", value: data.speakingLevel, emoji: "📊" },
  ];

  return (
    <View className="flex-1 px-4">
      {/* Full-screen Confetti Animation */}
      <ConfettiBurst />

      {/* Celebration Header - Fixed, no animation on wrapper */}
      <View className="items-center mb-10">
        <View className="items-center justify-center mb-6">
          <Text style={{ fontSize: 24 }}>🎉</Text>
        </View>

        <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
          You're all set!
        </Text>
        <Text className="text-gray-500 text-base text-center px-4 leading-6">
          Your personalized learning path is ready
        </Text>
      </View>

      {/* Summary Cards */}
      <View className="w-full">
        {summaries.map((item, i) => (
          <SummaryCard
            key={i}
            label={item.label}
            value={item.value}
            emoji={item.emoji}
            delay={400 + i * 150}
          />
        ))}
      </View>
    </View>
  );
};
