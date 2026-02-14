import { RainbowGradient } from "@/components/common/Rainbow";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface RainbowProgressBarProps {
  currentStep: number;
  totalSteps: number;
  subStep?: number;
  totalSubSteps?: number;
}

export const RainbowProgressBar: React.FC<RainbowProgressBarProps> = ({
  currentStep,
  totalSteps,
  subStep = 1,
  totalSubSteps = 1,
}) => {
  const [width, setWidth] = useState(0);
  // Calculate progress percentage (0 to 1)
  // When a step has sub-steps, interpolate within that step's range
  // Total effective segments = (totalSteps - 1) + (totalSubSteps - 1) for the step with sub-steps
  const extraSegments = totalSubSteps - 1; // additional segments from sub-steps
  const totalSegments = totalSteps - 1 + extraSegments;

  let effectivePosition: number;
  if (totalSubSteps > 1 && currentStep === 1) {
    // Within the first step's sub-steps
    effectivePosition = subStep - 1;
  } else {
    // Past the sub-step step: offset by the extra segments
    effectivePosition = (currentStep - 1) + extraSegments;
  }

  const progressPercent = Math.min(
    Math.max(effectivePosition / totalSegments, 0),
    1
  );

  // Shared value for animation
  const animatedProgress = useSharedValue(progressPercent);

  useEffect(() => {
    // Animate to new progress
    animatedProgress.value = withSpring(progressPercent, {
      damping: 30,
      stiffness: 100,
    });
  }, [progressPercent]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value * 100}%`,
    };
  });

  return (
    <View
      className="h-6 bg-gray-100 rounded-full w-full overflow-hidden"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          animatedStyle,
          { height: "100%", overflow: "hidden", borderRadius: 999 },
        ]}
      >
        {/* 
           We render the RainbowGradient at FULL width of the parent container.
           The parent Animated.View acts as a mask/window that reveals it.
           This ensures the gradient colors stay fixed and don't stretch/squish 
           (paralax-like reveal effect which fits "rainbow" well).
         */}
        <View style={{ width: width || "100%", height: "100%" }}>
          <RainbowGradient className="flex-1" />
        </View>
      </Animated.View>
    </View>
  );
};
