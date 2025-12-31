import { Pressable, PressableProps, Text } from 'react-native';

interface ButtonProps extends PressableProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'danger';
    className?: string; // Add className prop support
}

export function Button({ title, variant = 'primary', className, ...props }: ButtonProps) {
    const baseClasses = "py-3 px-6 rounded-2xl items-center justify-center active:opacity-90";
    const variants = {
        primary: "bg-blue-500 shadow-lg shadow-blue-500/30",
        secondary: "bg-gray-200",
        danger: "bg-red-500 shadow-lg shadow-red-500/30",
    };
    const textVariants = {
        primary: "text-white font-bold text-lg",
        secondary: "text-gray-800 font-bold text-lg",
        danger: "text-white font-bold text-lg",
    };

    return (
        <Pressable className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
            <Text className={textVariants[variant]}>{title}</Text>
        </Pressable>
    );
}
