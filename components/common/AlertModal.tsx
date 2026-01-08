import { FontAwesome5 } from "@expo/vector-icons";
import { X } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: "error" | "success";
}

export function AlertModal({
  visible,
  title,
  message,
  onClose,
  type = "error",
}: AlertModalProps) {
  const isSuccess = type === "success";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View className="flex-1 justify-center items-center bg-black/50 backdrop-blur-sm px-6">
        {/* Modal Card */}
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
          {/* Close button - top right */}
          <Pressable onPress={onClose} className="absolute top-4 right-4 p-1">
            <X size={22} color="gray" />
          </Pressable>

          {/* Icon - Error or Success */}
          <View className="items-center mb-5 mt-2">
            <View
              className={`w-14 h-14 rounded-full items-center justify-center ${
                isSuccess ? "bg-green-600" : "bg-red-600"
              }`}
            >
              <FontAwesome5
                name={isSuccess ? "check" : "exclamation"}
                size={22}
                color="white"
              />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-black text-center mb-2">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-gray-500 text-center text-base mb-6">
            {message}
          </Text>

          {/* Button */}
          <Pressable
            onPress={onClose}
            className="bg-gray-900 py-4 rounded-xl items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-base">OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
