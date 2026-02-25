import { RainbowGradient } from "@/components/common/Rainbow";
import { Colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface CustomSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const thumbSize = 80; // Large thumb (w-20)
  const trackHeight = 64; // h-16

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
  }, [value, sliderWidth, min, max, translateX]);

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
    // Fill width tracks to the CENTER of the thumb
    // When translateX = 0, thumb center is at thumbSize/2, so fill width = thumbSize/2
    // When translateX = sliderWidth, thumb center is at sliderWidth + thumbSize/2
    const fillWidth = translateX.value + thumbSize / 2;

    return {
      width: Math.max(0, fillWidth),
      height: trackHeight,
      position: "absolute" as const,
      left: 0,
      top: 0,
      borderRadius: trackHeight / 2,
      overflow: "hidden" as const,
    };
  });

  return (
    <View
      className="h-24 justify-center" // Increased container height
      onLayout={(e: LayoutChangeEvent) => {
        const fullWidth = e.nativeEvent.layout.width;
        setContainerWidth(fullWidth);
        // We subtract thumb size from width to keep thumb inside
        setSliderWidth(fullWidth - thumbSize);
      }}
    >
      {/* Background Track */}
      <View className="absolute w-full h-16 bg-gray-100 rounded-full overflow-hidden">
        {/* Active Fill with Rainbow Gradient - using fixed width SVG */}
        <Animated.View style={animatedFillStyle}>
          {containerWidth > 0 && (
            <Svg
              width={containerWidth}
              height={trackHeight}
              style={{ position: "absolute", left: 0, top: 0 }}
            >
              <Defs>
                <LinearGradient
                  id="sliderFillGrad"
                  x1="0%"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                >
                  {Colors.rainbow.map((color, index) => (
                    <Stop
                      key={color}
                      offset={`${(index * 100) / (Colors.rainbow.length - 1)}%`}
                      stopColor={color}
                    />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width={containerWidth}
                height={trackHeight}
                fill="url(#sliderFillGrad)"
              />
            </Svg>
          )}
        </Animated.View>
      </View>

      {/* Draggable Thumb Area */}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[animatedThumbStyle, { position: "absolute", left: 0 }]}
        >
          {/* Large Rainbow Thumb - refined shadow */}
          <View
            className="w-20 h-20 rounded-full shadow-lg items-center justify-center overflow-hidden"
            style={{
              elevation: 5,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <RainbowGradient
              style={{ width: "100%", height: "100%", position: "absolute" }}
            />
            {/* White inner circle for depth effect */}
            <View className="w-16 h-16 bg-white rounded-full" />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};
