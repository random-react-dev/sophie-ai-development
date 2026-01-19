import { RainbowBorder } from "@/components/common/Rainbow";
import { Pressable, PressableProps, Text } from "react-native";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "dark" | "rainbow";
  className?: string;
}

export function Button({
  title,
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const baseClasses =
    "py-4 px-6 rounded-xl items-center justify-center active:opacity-80";
  const variants = {
    primary: "bg-blue-500",
    secondary: "bg-gray-100",
    danger: "bg-red-500",
    dark: "bg-gray-900",
    rainbow: "bg-transparent p-0", // No background for wrapper, remove padding
  };
  const textVariants = {
    primary: "text-white font-semibold text-base",
    secondary: "text-gray-800 font-semibold text-base",
    danger: "text-white font-semibold text-base",
    dark: "text-white font-semibold text-base",
    rainbow: "text-gray-900 font-semibold text-base",
  };

  if (variant === "rainbow") {
    return (
      <Pressable className={`active:opacity-80 ${className}`} {...props}>
        <RainbowBorder
          borderWidth={2}
          borderRadius={9999} // Match rounded-xl
          innerBackgroundClassName="bg-white"
          className="w-full h-full"
          containerClassName="px-6 items-center justify-center" // Move padding here
        >
          <Text className={textVariants.rainbow}>{title}</Text>
        </RainbowBorder>
      </Pressable>
    );
  }

  return (
    <Pressable
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      <Text className={textVariants[variant]}>{title}</Text>
    </Pressable>
  );
}
