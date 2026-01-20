import { Colors } from '@/constants/theme';
import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface RainbowGradientProps {
    children?: React.ReactNode;
    className?: string;
    style?: ViewStyle;
}

/**
 * A component that wraps children with a balanced 7-color rainbow background.
 * Uses react-native-svg for reliable cross-platform rendering.
 */
export const RainbowGradient = ({ children, className, style }: RainbowGradientProps) => {
    return (
        <View className={`overflow-hidden relative ${className}`} style={style}>
            <View className="absolute inset-0">
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            {Colors.rainbow.map((color, index) => (
                                <Stop
                                    key={color}
                                    offset={`${(index * 100) / (Colors.rainbow.length - 1)}%`}
                                    stopColor={color}
                                />
                            ))}
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#rainbowGrad)" />
                </Svg>
            </View>
            {children}
        </View>
    );
};

interface RainbowBorderProps {
    children?: React.ReactNode;
    className?: string; // Classes for the outer gradient container
    containerClassName?: string; // Classes for the inner content container
    innerBackgroundClassName?: string; // Classes for the background of the inner content
    borderWidth?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * A component that creates a 7-color rainbow border around its children.
 * Works by layering an inner solid container over a slightly larger rainbow gradient container.
 * Uses react-native-svg for reliable cross-platform rendering.
 */
export const RainbowBorder = ({
    children,
    className = '',
    containerClassName = '',
    innerBackgroundClassName = 'bg-white',
    borderWidth = 2,
    borderRadius = 0,
    style
}: RainbowBorderProps) => {
    return (
        <View
            className={`overflow-hidden relative ${className}`}
            style={[{ borderRadius }, style]}
        >
            {/* Background Gradient Layer */}
            <View className="absolute inset-0">
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="rainbowBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            {Colors.rainbow.map((color, index) => (
                                <Stop
                                    key={color}
                                    offset={`${(index * 100) / (Colors.rainbow.length - 1)}%`}
                                    stopColor={color}
                                />
                            ))}
                        </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#rainbowBorderGrad)" />
                </Svg>
            </View>

            {/* Internal Content Container (Creates the border effect) */}
            <View
                className={`${innerBackgroundClassName} ${containerClassName}`}
                style={{
                    margin: borderWidth,
                    borderRadius: Math.max(0, borderRadius - borderWidth),
                    flex: 1,
                }}
            >
                {children}
            </View>
        </View>
    );
};

interface RainbowTextProps {
    text: string;
    className?: string;
    style?: ViewStyle;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    lineHeight?: number;
}

import { Text as RNText } from 'react-native';
import { Text as SvgText } from 'react-native-svg';

/**
 * A component that renders text with a rainbow gradient fill.
 * Uses an invisible Text component for layout and an overlay Svg for the gradient text.
 */
export const RainbowText = ({
    text,
    className = '',
    style,
    fontSize = 14,
    fontWeight = 'bold',
    lineHeight
}: RainbowTextProps) => {
    return (
        <View className={`relative ${className}`} style={style}>
            {/* Invisible Text for layout sizing */}
            <RNText
                style={{
                    fontSize,
                    fontWeight,
                    lineHeight,
                    opacity: 0,
                }}
            >
                {text}
            </RNText>

            {/* Absolute SVG overlay with Gradient Text */}
            <View className="absolute inset-0 items-center justify-center">
                <Svg height="100%" width="100%">
                    <Defs>
                        <LinearGradient id="rainbowTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            {Colors.rainbow.map((color, index) => (
                                <Stop
                                    key={color}
                                    offset={`${(index * 100) / (Colors.rainbow.length - 1)}%`}
                                    stopColor={color}
                                />
                            ))}
                        </LinearGradient>
                    </Defs>
                    <SvgText
                        fill="url(#rainbowTextGrad)"
                        stroke="none"
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        alignmentBaseline="central"
                    >
                        {text}
                    </SvgText>
                </Svg>
            </View>
        </View>
    );
};