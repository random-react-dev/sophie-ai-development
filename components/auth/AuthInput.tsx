import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface AuthInputProps extends TextInputProps {
    error?: string;
    rightElement?: React.ReactNode;
}

export function AuthInput({ error, rightElement, secureTextEntry, className, ...props }: AuthInputProps) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = secureTextEntry;

    return (
        <View className="w-full">
            <View className={`flex-row items-center w-full bg-gray-100 rounded-xl px-4 border ${error ? 'border-red-500' : 'border-transparent'}`}>
                <TextInput
                    className={`flex-1 py-4 text-gray-800 text-base ${className}`}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={isPassword && !isPasswordVisible}
                    autoCapitalize="none"
                    {...props}
                />

                {isPassword && (
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} className="p-2">
                        {isPasswordVisible ? (
                            <EyeOff size={20} color="#9CA3AF" />
                        ) : (
                            <Eye size={20} color="#9CA3AF" />
                        )}
                    </TouchableOpacity>
                )}

                {!isPassword && rightElement && (
                    <View className="ml-2">
                        {rightElement}
                    </View>
                )}
            </View>
            {error && (
                <Text className="text-red-500 text-sm mt-1 ml-1">{error}</Text>
            )}
        </View>
    );
}
