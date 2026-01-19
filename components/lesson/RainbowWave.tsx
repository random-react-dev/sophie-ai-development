import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface RainbowWaveProps {
    isListening: boolean;
    isSpeaking: boolean;
    isProcessing?: boolean;
    volumeLevel: number;
}

export const RainbowWave = React.memo(({ isListening, isSpeaking, isProcessing = false, volumeLevel }: RainbowWaveProps) => {
    const { width } = useWindowDimensions();
    const height = 160;
    const phase = useSharedValue(0);
    const amplitude = useSharedValue(0);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        phase.value = withRepeat(
            withTiming(2 * Math.PI, { duration: 1500, easing: Easing.linear }),
            -1,
            false
        );
    }, [phase]); // Run once on mount

    // Pulsing animation for processing state
    useEffect(() => {
        if (isProcessing) {
            pulseScale.value = withRepeat(
                withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            pulseScale.value = withTiming(1, { duration: 200 });
        }
    }, [isProcessing, pulseScale]);

    useEffect(() => {
        let targetAmplitude = 0;
        if (isSpeaking) {
            targetAmplitude = 45;
        } else if (isProcessing) {
            // Gentle breathing animation during processing
            targetAmplitude = 25;
        } else if (isListening) {
            targetAmplitude = Math.max(15, volumeLevel * 120);
        } else {
            targetAmplitude = 8;
        }

        // Only update if it's a significant change to reduce bridge traffic
        if (Math.abs(amplitude.value - targetAmplitude) > 0.1) {
            amplitude.value = withTiming(targetAmplitude, { duration: 100 });
        }
    }, [isListening, isSpeaking, isProcessing, volumeLevel, amplitude]);

    const animatedProps = useAnimatedProps(() => {
        const numPeaks = 6;
        const frequency = (Math.PI * numPeaks) / width;
        const currentAmplitude = amplitude.value;
        const currentPhase = phase.value;

        // Optimized: Use array.join() instead of string concatenation for better performance
        // Using step of 4 instead of 2 (50% fewer points, still smooth)
        const STEP = 4;
        const numPoints = Math.ceil(width / STEP) + 1;
        const pathParts = new Array(numPoints);
        pathParts[0] = `M 0 ${height / 2}`;

        let idx = 1;
        for (let x = STEP; x <= width; x += STEP) {
            const nx = x / width;
            const envelope = Math.pow(Math.sin(nx * Math.PI), 1.5);
            const y = (height / 2) + (envelope * currentAmplitude * Math.sin(frequency * x - currentPhase));
            pathParts[idx++] = `L ${x} ${y}`;
        }

        return {
            d: pathParts.join(' '),
        };
    });

    const animatedGlowProps = useAnimatedProps(() => {
        const numPeaks = 6;
        const frequency = (Math.PI * numPeaks) / width;
        const currentAmplitude = amplitude.value * 0.8;
        const currentPhase = phase.value + Math.PI / 2; // Offset phase for depth

        // Optimized: Use array.join() instead of string concatenation
        const STEP = 6; // Lower resolution for glow effect (was 4)
        const numPoints = Math.ceil(width / STEP) + 1;
        const pathParts = new Array(numPoints);
        pathParts[0] = `M 0 ${height / 2}`;

        let idx = 1;
        for (let x = STEP; x <= width; x += STEP) {
            const nx = x / width;
            const envelope = Math.pow(Math.sin(nx * Math.PI), 2.0);
            const y = (height / 2) + (envelope * currentAmplitude * Math.sin(frequency * x - currentPhase));
            pathParts[idx++] = `L ${x} ${y}`;
        }

        return {
            d: pathParts.join(' '),
        };
    });

    return (
        <View style={{ width: '100%', height }}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                <Defs>
                    <LinearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#FF0080" />
                        <Stop offset="0.5" stopColor="#FF8C00" />
                        <Stop offset="1" stopColor="#7B61FF" />
                    </LinearGradient>
                </Defs>
                {/* Secondary glow path */}
                <AnimatedPath
                    animatedProps={animatedGlowProps}
                    stroke="url(#rainbow)"
                    strokeWidth={2}
                    fill="transparent"
                    opacity={0.3}
                    strokeLinecap="round"
                />
                {/* Main path */}
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
});

RainbowWave.displayName = 'RainbowWave';
