import { AuthInput } from "@/components/auth/AuthInput";
import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { RainbowBorder } from "@/components/common/Rainbow";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps) {
  const { changePassword } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Alert Modal
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleSubmit = async () => {
    if (password.length < 6) {
      showAlert(
        "Error",
        "Password must be at least 6 characters long.",
        undefined,
        "error",
      );
      return;
    }
    if (password !== confirmPassword) {
      showAlert("Error", "Passwords do not match.", undefined, "error");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(password);
      showAlert(
        "Success",
        "Your password has been updated successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              setPassword("");
              setConfirmPassword("");
              onClose();
            },
          },
        ],
        "success",
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update password.";
      showAlert("Error", errorMessage, undefined, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-white">
          <SafeAreaView className="flex-1">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1"
            >
              <View className="flex-row justify-between items-center px-4 py-5 border-b border-gray-100">
                <View className="flex-1 pr-4">
                  <Text className="text-2xl font-bold text-gray-900">
                    Change Password
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                >
                  <Ionicons name="close" size={24} color="black" />
                </Pressable>
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              >
                <View className="mb-6">
                  <Text className="text-gray-500 font-medium mb-2 ml-1">
                    New Password
                  </Text>
                  <AuthInput
                    placeholder="Enter new password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <View className="mb-8">
                  <Text className="text-gray-500 font-medium mb-2 ml-1">
                    Confirm Password
                  </Text>
                  <AuthInput
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading || !password || !confirmPassword}
                  activeOpacity={0.8}
                >
                  {isLoading || !password || !confirmPassword ? (
                    <View className="w-full h-14 bg-gray-100 rounded-full items-center justify-center">
                      <Text className="text-gray-400 font-bold text-lg">
                        Update Password
                      </Text>
                    </View>
                  ) : (
                    <RainbowBorder
                      borderRadius={9999}
                      borderWidth={2}
                      className="h-14"
                      containerClassName="items-center justify-center"
                    >
                      <View className="flex-row items-center justify-center">
                        {isLoading ? (
                          <ActivityIndicator color="black" />
                        ) : (
                          <Text className="text-black font-bold text-lg">
                            Update Password
                          </Text>
                        )}
                      </View>
                    </RainbowBorder>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        onClose={hideAlert}
        type={alertState.type}
        buttons={alertState.buttons}
      />
    </>
  );
}
