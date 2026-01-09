import { Pressable, PressableProps, Text } from "react-native";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "dark";
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
  };
  const textVariants = {
    primary: "text-white font-semibold text-base",
    secondary: "text-gray-800 font-semibold text-base",
    danger: "text-white font-semibold text-base",
    dark: "text-white font-semibold text-base",
  };

  return (
    <Pressable
      className={`${baseClasses} ${variants[variant]} ${className}`}
      {...props}
    >
      <Text className={textVariants[variant]}>{title}</Text>
    </Pressable>
  );
}
