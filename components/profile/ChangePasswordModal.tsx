import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [showPassword, setShowPassword] = useState(false);

  // Alert Modal
  const { alertState, showAlert, hideAlert } = useAlertModal();

  const handleSubmit = async () => {
    if (password.length < 6) {
      showAlert(
        "Error",
        "Password must be at least 6 characters long.",
        undefined,
        "error"
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
        "success"
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
      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-end"
          >
            <View className="bg-white rounded-t-[32px] overflow-hidden max-h-[80%]">
              <View className="px-4 py-5 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
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
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              >
                <View className="mb-6">
                  <Text className="text-gray-500 font-medium mb-2">
                    New Password
                  </Text>
                  <View className="flex-row items-center border border-gray-300 rounded-2xl px-4 py-2 bg-gray-50">
                    <Lock size={20} color="#94a3b8" />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 text-base"
                      secureTextEntry={!showPassword}
                      placeholder="Enter new password"
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#94a3b8" />
                      ) : (
                        <Eye size={20} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="mb-8">
                  <Text className="text-gray-500 font-medium mb-2">
                    Confirm Password
                  </Text>
                  <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-2 bg-gray-50">
                    <Lock size={20} color="#94a3b8" />
                    <TextInput
                      className="flex-1 ml-3 text-gray-900 text-base"
                      secureTextEntry={!showPassword}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading || !password || !confirmPassword}
                  className={`w-full py-4 rounded-full items-center shadow-lg ${
                    isLoading || !password || !confirmPassword
                      ? "bg-gray-300 shadow-none"
                      : "bg-blue-500 shadow-blue-200"
                  }`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">
                      Update Password
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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
