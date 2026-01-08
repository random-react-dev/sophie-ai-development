import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

interface AuthInputProps extends TextInputProps {
  error?: string;
  rightElement?: React.ReactNode;
}

export function AuthInput({
  error,
  rightElement,
  secureTextEntry,
  className,
  ...props
}: AuthInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className="w-full">
      <View
        className={`flex-row items-center w-full bg-white rounded-full px-4 border ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      >
        <TextInput
          className={`flex-1 py-4 text-gray-900 text-base ${className}`}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && !isPasswordVisible}
          autoCapitalize="none"
          {...props}
        />

        <View className="flex-row items-center">
          {rightElement && (
            <View className={isPassword ? "mr-1" : ""}>{rightElement}</View>
          )}

          {isPassword && (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              className="p-2"
              activeOpacity={0.5}
            >
              {isPasswordVisible ? (
                <EyeOff size={22} color="#9CA3AF" />
              ) : (
                <Eye size={22} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {error && <Text className="text-red-500 text-sm mt-1 ml-1">{error}</Text>}
    </View>
  );
}
