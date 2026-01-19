import { RainbowGradient } from "@/components/common/Rainbow";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: "error" | "success" | "warning" | "info";
  buttons?: AlertButton[];
}

export function AlertModal({
  visible,
  title,
  message,
  onClose,
  type = "info",
  buttons,
}: AlertModalProps) {
  // Get icon and color based on type
  const getIconConfig = () => {
    switch (type) {
      case "success":
        return { name: "check", bgColor: "bg-green-500" };
      case "warning":
        return { name: "exclamation", bgColor: "bg-yellow-500" };
      case "error":
        return { name: "times", bgColor: "bg-red-500" };
      case "info":
      default:
        return { name: "info", bgColor: "bg-blue-500" };
    }
  };

  const { name: iconName, bgColor } = getIconConfig();

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onClose();
  };

  // Default to single OK button if no buttons provided
  const displayButtons: AlertButton[] = buttons || [
    { text: "OK", style: "default" },
  ];

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
            <Ionicons name="close" size={24} color="black" />
          </Pressable>

          {/* Icon - Error, Success, Warning, or Info */}
          <View className="items-center mb-5 mt-2">
            <View
              className={`w-14 h-14 rounded-full items-center justify-center ${bgColor}`}
            >
              <FontAwesome5 name={iconName} size={22} color="white" />
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

          {/* Buttons */}
          {displayButtons.length === 1 ? (
            <Pressable
              onPress={() => handleButtonPress(displayButtons[0])}
              className="rounded-full overflow-hidden active:opacity-80"
            >
              <RainbowGradient className="py-4 items-center">
                <Text className="text-white font-semibold text-base">
                  {displayButtons[0].text}
                </Text>
              </RainbowGradient>
            </Pressable>
          ) : (
            <View className="flex-row gap-3">
              {displayButtons.map((button, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  className={`flex-1 rounded-full overflow-hidden active:opacity-80 ${
                    button.style === "cancel" ? "bg-gray-200" : ""
                  }`}
                >
                  {button.style === "destructive" ? (
                    <View className="bg-red-500 py-4 items-center">
                      <Text className="text-white font-semibold text-base">
                        {button.text}
                      </Text>
                    </View>
                  ) : button.style === "cancel" ? (
                    <View className="py-4 items-center">
                      <Text className="text-gray-700 font-semibold text-base">
                        {button.text}
                      </Text>
                    </View>
                  ) : (
                    <RainbowGradient className="py-4 items-center">
                      <Text className="text-white font-semibold text-base">
                        {button.text}
                      </Text>
                    </RainbowGradient>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Hook for easier usage
export function useAlertModal() {
  const [alertState, setAlertState] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "error" | "success" | "warning" | "info";
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: AlertButton[],
    type: "error" | "success" | "warning" | "info" = "info"
  ) => {
    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  return { alertState, showAlert, hideAlert };
}
