import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

interface CircleFlagProps {
    countryCode: string;
    size?: number;
}

/**
 * Renders a circular flag image using SVG from circle-flags CDN.
 * Wrapped in a View with overflow-hidden for proper Android clipping.
 */
export default function CircleFlag({ countryCode, size = 28 }: CircleFlagProps) {
    const flagUrl = `https://hatscripts.github.io/circle-flags/flags/${countryCode.toLowerCase()}.svg`;

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                overflow: 'hidden',
            }}
        >
            <Image
                source={{ uri: flagUrl }}
                style={{ width: size, height: size }}
                contentFit="cover"
            />
        </View>
    );
}
