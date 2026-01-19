import { RainbowGradient } from "@/components/common/Rainbow";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface RainbowTabIndicatorProps {
  activeIndex: number;
  tabCount: number;
  tabWidth: number;
  height?: number;
  // Offset for special center button (Talk tab)
  skipCenterTab?: boolean;
}

/**
 * Animated rainbow underline indicator for tab bar.
 * Smoothly slides to the active tab position.
 */
export const RainbowTabIndicator: React.FC<RainbowTabIndicatorProps> = ({
  activeIndex,
  tabCount,
  tabWidth,
  height = 3,
  skipCenterTab = false,
}) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Calculate position based on active index
    let targetX = activeIndex * tabWidth;

    // Adjust for center tab if needed (Talk tab is hidden/special)
    if (skipCenterTab && activeIndex >= Math.floor(tabCount / 2)) {
      // Skip the center position
      targetX = activeIndex * tabWidth;
    }

    translateX.value = withSpring(targetX, {
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    });
  }, [activeIndex, tabWidth, tabCount, skipCenterTab]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height,
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: tabWidth,
            height,
          },
        ]}
      >
        <RainbowGradient
          style={{
            flex: 1,
            marginHorizontal: 12,
            borderRadius: height / 2,
          }}
        />
      </Animated.View>
    </View>
  );
};
