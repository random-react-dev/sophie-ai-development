import { useVolumeLevel } from "@/stores/conversationStore";
import React, { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface RainbowWaveProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing?: boolean;
  width?: number;
  height?: number;
  amplitudeScale?: number;
  /**
   * When true, renders a static (non-animated) rainbow line.
   * Useful for decorative purposes in headers/modals.
   */
  static?: boolean;
}

export function RainbowWave({
  isListening,
  isSpeaking,
  isProcessing = false,
  width: customWidth,
  height: customHeight = 160,
  amplitudeScale = 1.0,
  static: isStatic = false,
}: RainbowWaveProps) {
  const volumeLevel = useVolumeLevel();
  const { width: windowWidth } = useWindowDimensions();
  const width = customWidth || windowWidth;
  const height = customHeight;
  const phase = useSharedValue(0);
  const amplitude = useSharedValue(height * 0.24 * amplitudeScale); // Match InteractiveRainbowWave: height * 0.24

  // Animation speed matching InteractiveRainbowWave: speed = 0.09 per frame at 60fps
  // 0.09 * 60 = 5.4 radians per second
  // 2π / 5.4 ≈ 1.16 seconds for full cycle
  useEffect(() => {
    // Skip animation if static mode
    if (isStatic) return;

    phase.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 1160, easing: Easing.linear }),
      -1,
      false,
    );
  }, [phase, isStatic]);

  // Amplitude responds to voice states while maintaining base amplitude
  useEffect(() => {
    // Skip if static mode
    if (isStatic) return;

    // Base amplitude from InteractiveRainbowWave: height * 0.24 = 38.4
    const baseAmplitude = height * 0.24 * amplitudeScale;

    // Idle state: nearly flat with very subtle shimmer (5% of base amplitude)
    let targetAmplitude = baseAmplitude * 0.05;

    if (isSpeaking) {
      targetAmplitude = baseAmplitude * 1.5; // Visible waves when speaking
    } else if (isProcessing) {
      targetAmplitude = baseAmplitude * 0.3; // Gentle breathing when processing
    } else if (isListening) {
      // Voice-reactive amplitude
      targetAmplitude = Math.max(
        baseAmplitude * 0.3, // Minimum visible amplitude when listening
        baseAmplitude + volumeLevel * 40,
      );
    }

    // Always animate to target - withTiming will cancel any in-progress animation
    amplitude.value = withTiming(targetAmplitude, { duration: 150 });
  }, [
    isListening,
    isSpeaking,
    isProcessing,
    volumeLevel,
    amplitude,
    height,
    amplitudeScale,
    isStatic,
  ]);

  const animatedProps = useAnimatedProps(() => {
    const numPeaks = 8;
    const frequency = (Math.PI * numPeaks) / width;
    const currentAmplitude = amplitude.value;
    const currentPhase = phase.value;

    // Match InteractiveRainbowWave: step of 2 for smooth curve
    const STEP = 2;
    const numPoints = Math.ceil(width / STEP) + 1;
    const pathParts = new Array(numPoints);
    pathParts[0] = `M 0 ${height / 2}`;

    let idx = 1;
    for (let x = STEP; x <= width; x += STEP) {
      const nx = x / width;
      // Envelope function - exactly like InteractiveRainbowWave
      const envelope = Math.pow(Math.sin(nx * Math.PI), 1.5);
      const y =
        height / 2 +
        envelope * currentAmplitude * Math.sin(frequency * x - currentPhase);
      pathParts[idx++] = `L ${x} ${y}`;
    }

    return {
      d: pathParts.join(" "),
    };
  });

  // Static path for non-animated mode - render a gentle wave (not flat)
  // Uses the same wave algorithm but with fixed phase and gentle amplitude
  const generateStaticPath = () => {
    const numPeaks = 8;
    const frequency = (Math.PI * numPeaks) / width;
    // Gentle amplitude for static wave - 30% of base for natural look
    const staticAmplitude = height * 0.24 * amplitudeScale * 0.3;
    const staticPhase = Math.PI / 4; // Fixed phase offset for nice curve shape

    const STEP = 2;
    const numPoints = Math.ceil(width / STEP) + 1;
    const pathParts = new Array(numPoints);
    pathParts[0] = `M 0 ${height / 2}`;

    let idx = 1;
    for (let x = STEP; x <= width; x += STEP) {
      const nx = x / width;
      // Envelope function - exactly like animated version
      const envelope = Math.pow(Math.sin(nx * Math.PI), 1.5);
      const y =
        height / 2 +
        envelope * staticAmplitude * Math.sin(frequency * x - staticPhase);
      pathParts[idx++] = `L ${x} ${y}`;
    }

    return pathParts.join(" ");
  };

  const staticPath = isStatic ? generateStaticPath() : "";

  return (
    <View style={{ width: customWidth || "100%", height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF0000" />
            <Stop offset="0.17" stopColor="#FF7F00" />
            <Stop offset="0.33" stopColor="#FFFF00" />
            <Stop offset="0.5" stopColor="#00FF00" />
            <Stop offset="0.67" stopColor="#0000FF" />
            <Stop offset="0.83" stopColor="#4B0082" />
            <Stop offset="1" stopColor="#9400D3" />
          </LinearGradient>
        </Defs>
        {isStatic ? (
          // Static mode: render a simple horizontal line
          <Path
            d={staticPath}
            stroke="url(#rainbow)"
            strokeWidth={4}
            fill="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Animated mode: render animated wave path
          <AnimatedPath
            animatedProps={animatedProps}
            stroke="url(#rainbow)"
            strokeWidth={4}
            fill="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </View>
  );
}
