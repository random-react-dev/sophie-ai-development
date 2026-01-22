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
  volumeLevel: number;
}

export const RainbowWave = React.memo(
  ({
    isListening,
    isSpeaking,
    isProcessing = false,
    volumeLevel,
  }: RainbowWaveProps) => {
    const { width } = useWindowDimensions();
    const height = 160;
    const phase = useSharedValue(0);
    const amplitude = useSharedValue(height * 0.24); // Match InteractiveRainbowWave: height * 0.24

    // Animation speed matching InteractiveRainbowWave: speed = 0.09 per frame at 60fps
    // 0.09 * 60 = 5.4 radians per second
    // 2π / 5.4 ≈ 1.16 seconds for full cycle
    useEffect(() => {
      phase.value = withRepeat(
        withTiming(2 * Math.PI, { duration: 1160, easing: Easing.linear }),
        -1,
        false,
      );
    }, [phase]);

    // Amplitude responds to voice states while maintaining base amplitude
    useEffect(() => {
      // Base amplitude from InteractiveRainbowWave: height * 0.24 = 38.4
      const baseAmplitude = height * 0.24;
      let targetAmplitude = baseAmplitude;

      if (isSpeaking) {
        targetAmplitude = baseAmplitude * 1.5; // Slightly larger when speaking
      } else if (isProcessing) {
        targetAmplitude = baseAmplitude * 0.8; // Gentle breathing
      } else if (isListening) {
        targetAmplitude = Math.max(
          baseAmplitude,
          baseAmplitude + volumeLevel * 40,
        );
      }
      // Idle state: use baseAmplitude (same as InteractiveRainbowWave)

      if (Math.abs(amplitude.value - targetAmplitude) > 0.1) {
        amplitude.value = withTiming(targetAmplitude, { duration: 150 });
      }
    }, [isListening, isSpeaking, isProcessing, volumeLevel, amplitude]);

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

    return (
      <View style={{ width: "100%", height }}>
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
          {/* Main wave path - matching InteractiveRainbowWave exactly */}
          <AnimatedPath
            animatedProps={animatedProps}
            stroke="url(#rainbow)"
            strokeWidth={4}
            fill="transparent"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  },
);

RainbowWave.displayName = "RainbowWave";
