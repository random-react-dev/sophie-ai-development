import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface CustomSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  emoji: string;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
  emoji,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const thumbSize = 80; // Large thumb (w-20)
  const padding = thumbSize / 2;

  // Shared value for thumb position (0 to sliderWidth)
  const translateX = useSharedValue(0);
  const context = useSharedValue(0);

  // Update position when external value changes
  useEffect(() => {
    if (sliderWidth > 0) {
      const range = max - min;
      const percentage = (value - min) / range;
      const targetX = percentage * sliderWidth;
      translateX.value = withSpring(targetX, { damping: 40, stiffness: 150 });
    }
  }, [value, sliderWidth, min, max]);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateX.value;
    })
    .onUpdate((event) => {
      let newX = context.value + event.translationX;
      // Clamp values
      if (newX < 0) newX = 0;
      if (newX > sliderWidth) newX = sliderWidth;

      translateX.value = newX;

      // Calculate implied value for snapping logic
      const range = max - min;
      const percentage = newX / sliderWidth;
      const approximateValue = min + percentage * range;
      const steppedValue = Math.round(approximateValue / step) * step;

      // Update parent only if value changed
      if (
        steppedValue !== value &&
        steppedValue >= min &&
        steppedValue <= max
      ) {
        runOnJS(onValueChange)(steppedValue);
        runOnJS(Haptics.selectionAsync)();
      }
    })
    .onEnd(() => {
      // Snap to exact step position
      const range = max - min;
      const percentage = (value - min) / range;
      const targetX = percentage * sliderWidth;
      translateX.value = withSpring(targetX);
    });

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedFillStyle = useAnimatedStyle(() => {
    // Interpolate width: start at center of thumb, end at full container width
    const width = interpolate(
      translateX.value,
      [0, sliderWidth],
      [thumbSize / 2, sliderWidth + thumbSize],
      Extrapolation.CLAMP
    );
    return { width };
  });

  return (
    <View
      className="h-24 justify-center" // Increased container height
      onLayout={(e: LayoutChangeEvent) => {
        // We subtract thumb size from width to keep thumb inside
        setSliderWidth(e.nativeEvent.layout.width - thumbSize);
      }}
    >
      {/* Background Track - Removed Border */}
      <View className="absolute w-full h-16 bg-gray-100 rounded-full overflow-hidden">
        {/* Active Fill */}
        <Animated.View
          className="h-full bg-blue-500 rounded-full"
          style={animatedFillStyle}
        />
      </View>

      {/* Draggable Thumb Area */}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[animatedThumbStyle, { position: "absolute", left: 0 }]}
        >
          {/* Large Emoji Thumb - refined shadow */}
          <View
            className="w-20 h-20 bg-white rounded-full shadow-lg border-4 border-white items-center justify-center"
            style={{
              elevation: 5,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Text style={{ fontSize: 40 }}>{emoji}</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
