import React from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface CustomToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackActiveColor?: string;
  trackInactiveColor?: string;
  thumbColor?: string;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 24;
const THUMB_SIZE = 20;
const THUMB_MARGIN = 2;

export function CustomToggle({
  value,
  onValueChange,
  trackActiveColor = "#3B82F6",
  trackInactiveColor = "#E2E8F0",
  thumbColor = "#FFFFFF",
}: CustomToggleProps) {
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [trackInactiveColor, trackActiveColor]
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [THUMB_MARGIN, TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN]
        ),
      },
    ],
  }));

  const handlePress = () => {
    onValueChange(!value);
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          trackStyle,
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            justifyContent: "center",
          },
        ]}
      >
        <Animated.View
          style={[
            thumbStyle,
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: thumbColor,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
