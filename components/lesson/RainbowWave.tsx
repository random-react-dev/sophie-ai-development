import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface RainbowWaveProps {
    isListening: boolean;
    isSpeaking: boolean;
    volumeLevel: number;
}

export const RainbowWave = React.memo(({ isListening, isSpeaking, volumeLevel }: RainbowWaveProps) => {
    const { width } = useWindowDimensions();
    const height = 160;
    const phase = useSharedValue(0);
    const amplitude = useSharedValue(0);

    useEffect(() => {
        phase.value = withRepeat(
            withTiming(2 * Math.PI, { duration: 1500, easing: Easing.linear }),
            -1,
            false
        );
    }, [phase]); // Run once on mount

    useEffect(() => {
        let targetAmplitude = 0;
        if (isSpeaking) {
            targetAmplitude = 45; 
        } else if (isListening) {
            targetAmplitude = Math.max(15, volumeLevel * 120);
        } else {
            targetAmplitude = 8;
        }
        
        // Only update if it's a significant change to reduce bridge traffic
        if (Math.abs(amplitude.value - targetAmplitude) > 0.1) {
            amplitude.value = withTiming(targetAmplitude, { duration: 100 });
        }
    }, [isListening, isSpeaking, volumeLevel, amplitude]);

    const animatedProps = useAnimatedProps(() => {
        const numPeaks = 6;
        const frequency = (Math.PI * numPeaks) / width;
        const currentAmplitude = amplitude.value;
        const currentPhase = phase.value;

        let path = `M 0 ${height / 2}`;

        // Higher resolution for smoothness (step of 2 instead of 5)
        for (let x = 0; x <= width; x += 2) {
            const nx = x / width;
            // Refined envelope function from reference
            const envelope = Math.pow(Math.sin(nx * Math.PI), 1.5);
            const y = (height / 2) + (envelope * currentAmplitude * Math.sin(frequency * x - currentPhase));
            path += ` L ${x} ${y}`;
        }

        return {
            d: path,
        };
    });

    const animatedGlowProps = useAnimatedProps(() => {
        const numPeaks = 6;
        const frequency = (Math.PI * numPeaks) / width;
        const currentAmplitude = amplitude.value * 0.8;
        const currentPhase = phase.value + Math.PI / 2; // Offset phase for depth

        let path = `M 0 ${height / 2}`;

        for (let x = 0; x <= width; x += 4) {
            const nx = x / width;
            const envelope = Math.pow(Math.sin(nx * Math.PI), 2.0);
            const y = (height / 2) + (envelope * currentAmplitude * Math.sin(frequency * x - currentPhase));
            path += ` L ${x} ${y}`;
        }

        return {
            d: path,
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
