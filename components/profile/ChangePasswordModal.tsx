import { useAuthStore } from '@/stores/authStore';
import { Eye, EyeOff, Lock, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
    const { changePassword } = useAuthStore();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long.");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            await changePassword(password);
            Alert.alert("Success", "Your password has been updated successfully.");
            setPassword('');
            setConfirmPassword('');
            onClose();
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    className="flex-1 justify-end"
                >
                    <View className="bg-white rounded-t-[32px] overflow-hidden max-h-[80%]">
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">Change Password</Text>
                            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                                <X size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                            <View className="mb-6">
                                <Text className="text-gray-500 font-medium mb-2">New Password</Text>
                                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50 focus:border-blue-500">
                                    <Lock size={20} color="#94a3b8" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900 text-base"
                                        secureTextEntry={!showPassword}
                                        placeholder="Enter new password"
                                        value={password}
                                        onChangeText={setPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="mb-8">
                                <Text className="text-gray-500 font-medium mb-2">Confirm Password</Text>
                                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3 bg-gray-50 focus:border-blue-500">
                                    <Lock size={20} color="#94a3b8" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900 text-base"
                                        secureTextEntry={!showPassword}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={isLoading || !password || !confirmPassword}
                                className={`w-full py-4 rounded-full items-center shadow-lg ${isLoading || !password || !confirmPassword
                                        ? 'bg-gray-300 shadow-none'
                                        : 'bg-blue-500 shadow-blue-200'
                                    }`}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}
