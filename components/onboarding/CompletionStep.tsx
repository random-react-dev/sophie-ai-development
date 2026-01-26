import { RainbowBorder } from "@/components/common/Rainbow";
import { Colors } from "@/constants/theme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useRef } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// Sophie intro video source
const videoSource = require("@/assets/videos/sophieintro.mp4");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Center of the screen
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT * 0.35; // Position at top third for better visual

// Individual confetti piece that bursts outward from center
const ConfettiPiece: React.FC<{
  delay: number;
  angle: number; // Radial angle in radians
  distance: number; // How far it travels
  color: string;
  size: number;
  shape: "square" | "circle" | "rect";
  rotationSpeed: number;
}> = ({ delay, angle, distance, color, size, shape, rotationSpeed }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Initial pop-in scale
    scale.value = withDelay(
      delay,
      withTiming(1, {
        duration: 150,
        easing: Easing.out(Easing.back(2)),
      }),
    );

    // Burst outward from center
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 800 + Math.random() * 400,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Rotation
    rotate.value = withDelay(
      delay,
      withTiming(rotationSpeed * 360, {
        duration: 1200,
        easing: Easing.out(Easing.quad),
      }),
    );

    // Fade out
    opacity.value = withDelay(
      delay + 600,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.ease),
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate position based on angle and progress
    const currentDistance = distance * progress.value;
    const x = Math.cos(angle) * currentDistance;
    const y = Math.sin(angle) * currentDistance;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotate.value}deg` },
        { scale: scale.value * (1 - progress.value * 0.3) }, // Shrink as it moves
      ],
      opacity: opacity.value,
    };
  });

  const getShapeStyle = () => {
    switch (shape) {
      case "circle":
        return { borderRadius: size / 2 };
      case "rect":
        return { width: size * 1.5, height: size * 0.6, borderRadius: 2 };
      default:
        return { borderRadius: 3 };
    }
  };

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: CENTER_X - size / 2,
          top: CENTER_Y - size / 2,
          width: size,
          height: shape === "rect" ? size * 0.6 : size,
          backgroundColor: color,
          ...getShapeStyle(),
        },
        animatedStyle,
      ]}
    />
  );
};

// Full center-burst explosion - Square Confetti Exploded style
const CenterBurstConfetti: React.FC = () => {
  // Premium colorful palette
  const colors = [
    "#2563eb", // Blue
    "#3b82f6", // Light Blue
    "#fbbf24", // Yellow/Gold
    "#f97316", // Orange
    "#ef4444", // Red
    "#22c55e", // Green
    "#a855f7", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
  ];

  const shapes: ("square" | "circle" | "rect")[] = ["square", "circle", "rect"];

  // Create 60 confetti pieces in a radial burst pattern
  const pieces = [];
  const particleCount = 60;

  for (let i = 0; i < particleCount; i++) {
    // Spread particles in all directions (360 degrees)
    const baseAngle = (i / particleCount) * Math.PI * 2;
    const angleVariation = (Math.random() - 0.5) * 0.5; // Add some randomness
    const angle = baseAngle + angleVariation;

    pieces.push({
      id: i,
      delay: Math.random() * 200, // Slight stagger for natural look
      angle,
      distance: 150 + Math.random() * 200, // Random distance 150-350px
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 10 + Math.random() * 14, // Size 10-24px
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotationSpeed: 1 + Math.random() * 3, // 1-4 rotations
    });
  }

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
        zIndex: 10,
      }}
    >
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          angle={piece.angle}
          distance={piece.distance}
          color={piece.color}
          size={piece.size}
          shape={piece.shape}
          rotationSpeed={piece.rotationSpeed}
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
  accentColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  emoji,
  delay,
  accentColor,
}) => {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      className="mb-3"
    >
      <View
        className="flex-row bg-white rounded-2xl overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Left Accent Strip */}
        <View
          style={{
            width: 5,
            backgroundColor: accentColor,
          }}
        />

        {/* Card Content */}
        <View className="flex-1 flex-row items-center px-5 py-4">
          {/* Emoji */}
          <Text style={{ fontSize: 32 }}>{emoji}</Text>

          {/* Content */}
          <View className="flex-1 ml-4">
            <Text className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {label}
            </Text>
            <Text className="text-lg font-semibold text-gray-800 capitalize">
              {value || "Not set"}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};
// Premium Custom Video Player Component
const SophieIntroVideo: React.FC = () => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showControls, setShowControls] = React.useState(false);
  const [isVideoComplete, setIsVideoComplete] = React.useState(false);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Animated values
  const controlsOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Handle controls visibility with fade animation
  useEffect(() => {
    if (showControls) {
      controlsOpacity.value = withTiming(1, { duration: 200 });

      // Auto-hide controls after 2 seconds if playing
      if (isPlaying && !isVideoComplete) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false);
        }, 1000);
      }
    } else {
      controlsOpacity.value = withTiming(0, { duration: 200 });
    }

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [showControls, isPlaying, isVideoComplete]);

  // Handle tap on video - toggle play/pause AND show controls with instant feedback
  const handleVideoTap = async () => {
    // Clear any pending hide timeout
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    // Always show controls on tap
    setShowControls(true);

    // Toggle play/pause with instant visual feedback
    if (videoRef.current) {
      if (isPlaying) {
        // Set state FIRST for instant icon update
        setIsPlaying(false);
        await videoRef.current.pauseAsync();
      } else {
        // If video completed, replay from start
        if (isVideoComplete) {
          await videoRef.current.setPositionAsync(0);
          setIsVideoComplete(false);
        }
        // Set state FIRST for instant icon update
        setIsPlaying(true);
        await videoRef.current.playAsync();
      }
    }
  };

  // Handle play/pause button with animation (when tapping the button directly)
  const handlePlayPause = async () => {
    // Animate button press
    buttonScale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }, 100);

    if (videoRef.current) {
      if (isPlaying) {
        setIsPlaying(false);
        await videoRef.current.pauseAsync();
      } else {
        if (isVideoComplete) {
          await videoRef.current.setPositionAsync(0);
          setIsVideoComplete(false);
        }
        setIsPlaying(true);
        await videoRef.current.playAsync();
      }
    }
  };

  // Animated styles
  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(200).springify()}
      className="w-full mb-4"
    >
      {/* Premium Video Container */}
      <View
        style={[
          styles.videoContainer,
          {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        {/* Video Player */}
        <Video
          ref={videoRef}
          source={videoSource}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          isLooping={false}
          shouldPlay={true}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              // Detect video completion
              if (status.didJustFinish) {
                setIsVideoComplete(true);
                setShowControls(true);
              }
            }
          }}
        />

        {/* Tap Overlay to Show Controls */}
        <Pressable style={styles.tapOverlay} onPress={handleVideoTap}>
          {/* Controls Overlay with Fade Animation */}
          <Animated.View
            style={[styles.controlsOverlay, controlsAnimatedStyle]}
          >
            {/* Rainbow Border Play/Pause Button */}
            <Pressable onPress={handlePlayPause} style={styles.playPauseButton}>
              <Animated.View style={buttonAnimatedStyle}>
                {/* Rainbow Border from system-design */}
                <RainbowBorder
                  borderWidth={2}
                  borderRadius={28}
                  style={{ width: 56, height: 56 }}
                  innerBackgroundClassName="bg-white"
                >
                  {/* Play/Pause Icon */}
                  <View style={styles.playPauseInner}>
                    {isPlaying ? (
                      <View style={styles.pauseIcon}>
                        <View style={styles.pauseBar} />
                        <View style={styles.pauseBar} />
                      </View>
                    ) : (
                      <View style={styles.playIcon} />
                    )}
                  </View>
                </RainbowBorder>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </View>

      {/* Video Label */}
      <Text className="text-center text-gray-500 text-sm mt-3 font-medium">
        Meet Your AI Language Coach
      </Text>
    </Animated.View>
  );
};

// Styles for video component
const styles = StyleSheet.create({
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  pauseIcon: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 22,
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
  },
  playIcon: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 18,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: "#1a1a1a",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
});

export const CompletionStep = () => {
  const { data } = useOnboardingStore();

  const summaries = [
    { label: "Primary Goal", value: data.mainGoal, emoji: "🎯" },
    { label: "Learning Pace", value: data.fluencySpeed, emoji: "🏃" },
    { label: "Current Level", value: data.speakingLevel, emoji: "📊" },
  ];

  return (
    <View className="flex-1 px-4">
      {/* Center Burst Confetti Explosion - Square Confetti Exploded Style */}
      <CenterBurstConfetti />

      {/* Celebration Header */}
      <View className="items-center mb-5">
        {/* Static Emoji */}
        <View className="size-16 bg-gray-100 items-center justify-center rounded-full mb-2">
          <Text style={{ fontSize: 24 }}>🎉</Text>
        </View>

        <Text className="text-3xl font-bold text-gray-900 text-center mb-2">
          You&apos;re all set!
        </Text>
        <Text className="text-gray-500 text-base text-center px-4 leading-6 w-full">
          Your personalized learning path is ready
        </Text>
      </View>

      {/* Sophie Intro Video */}
      <SophieIntroVideo />

      {/* Summary Cards */}
      <View className="w-full">
        {summaries.map((item, i) => (
          <SummaryCard
            key={i}
            label={item.label}
            value={item.value}
            emoji={item.emoji}
            delay={400 + i * 150}
            accentColor={Colors.rainbow[i % Colors.rainbow.length]}
          />
        ))}
      </View>
    </View>
  );
};
