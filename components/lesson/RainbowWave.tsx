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

export const RainbowWave = ({ isListening, isSpeaking, volumeLevel }: RainbowWaveProps) => {
    const { width } = useWindowDimensions();
    const height = 160;
    const phase = useSharedValue(0);
    const amplitude = useSharedValue(0);

    useEffect(() => {
        phase.value = withRepeat(
            withTiming(2 * Math.PI, { duration: 2000, easing: Easing.linear }),
            -1,
            false
        );
    }, [phase]);

    useEffect(() => {
        let targetAmplitude = 0;
        if (isSpeaking) {
            targetAmplitude = 40; // Pulsing while AI speaks
        } else if (isListening) {
            targetAmplitude = Math.max(10, volumeLevel * 100); // Reactive to user volume
        } else {
            targetAmplitude = 5; // Idle wave
        }
        amplitude.value = withTiming(targetAmplitude, { duration: 100 });
    }, [isListening, isSpeaking, volumeLevel, amplitude]);

    const animatedProps = useAnimatedProps(() => {
        const numPeaks = 8;
        const frequency = (Math.PI * numPeaks) / width;
        const currentAmplitude = amplitude.value;
        const currentPhase = phase.value;

        let path = `M 0 ${height / 2}`;

        for (let x = 0; x <= width; x += 5) {
            const nx = x / width;
            // Envelope function to taper edges
            const envelope = Math.pow(Math.sin(nx * Math.PI), 1.5);
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
                        <Stop offset="0" stopColor="#FF0000" />
                        <Stop offset="0.17" stopColor="#FF7F00" />
                        <Stop offset="0.33" stopColor="#FFFF00" />
                        <Stop offset="0.5" stopColor="#00FF00" />
                        <Stop offset="0.67" stopColor="#0000FF" />
                        <Stop offset="0.83" stopColor="#4B0082" />
                        <Stop offset="1" stopColor="#9400D3" />
                    </LinearGradient>
                </Defs>
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
};
