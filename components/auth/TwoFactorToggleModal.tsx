import { AlertModal, useAlertModal } from "@/components/common/AlertModal";
import { RainbowBorder } from "@/components/common/Rainbow";
import { useTranslation } from "@/hooks/useTranslation";
import { toggle2FA } from "@/services/supabase/auth";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TwoFactorToggleModalProps {
    visible: boolean;
    onClose: () => void;
    currentlyEnabled: boolean;
}

export default function TwoFactorToggleModal({
    visible,
    onClose,
    currentlyEnabled,
}: TwoFactorToggleModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const { alertState, showAlert, hideAlert } = useAlertModal();

    const handleToggle = async () => {
        setIsLoading(true);
        try {
            const newValue = !currentlyEnabled;
            const { error } = await toggle2FA(newValue);
            if (error) throw error;

            // Also update local user state optimistically
            useAuthStore.setState((state) => {
                if (!state.user) return state;
                return {
                    user: {
                        ...state.user,
                        user_metadata: {
                            ...state.user.user_metadata,
                            two_factor_enabled: newValue,
                        },
                    },
                };
            });

            const successKey = newValue
                ? "profile.security_screen.two_factor.toggle_success_enabled"
                : "profile.security_screen.two_factor.toggle_success_disabled";

            showAlert(t("common.success"), t(successKey), [
                {
                    text: t("common.ok"),
                    onPress: () => onClose(),
                },
            ], "success");
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to update 2FA setting";
            showAlert(t("common.error"), msg, undefined, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const titleKey = currentlyEnabled
        ? "profile.security_screen.two_factor.disable_title"
        : "profile.security_screen.two_factor.enable_title";
    const bodyKey = currentlyEnabled
        ? "profile.security_screen.two_factor.disable_body"
        : "profile.security_screen.two_factor.enable_body";
    const buttonKey = currentlyEnabled
        ? "profile.security_screen.two_factor.disable_button"
        : "profile.security_screen.two_factor.enable_button";

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
                        {/* Header */}
                        <View className="flex-row justify-between items-center px-4 py-5 border-b border-gray-100">
                            <View className="flex-1 pr-4">
                                <Text className="text-xl font-bold text-gray-900">
                                    {t(titleKey)}
                                </Text>
                            </View>
                            <Pressable
                                onPress={onClose}
                                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                            >
                                <Ionicons name="close" size={24} color="black" />
                            </Pressable>
                        </View>

                        {/* Content */}
                        <View className="flex-1 px-6 pt-8">
                            {/* Icon */}
                            <View className="items-center mb-6">
                                <View
                                    className={`w-20 h-20 rounded-full items-center justify-center ${currentlyEnabled ? "bg-red-50" : "bg-green-50"
                                        }`}
                                >
                                    <Ionicons
                                        name={currentlyEnabled ? "shield-outline" : "shield-checkmark-outline"}
                                        size={36}
                                        color={currentlyEnabled ? "#ef4444" : "#16a34a"}
                                    />
                                </View>
                            </View>

                            {/* Description */}
                            <Text className="text-gray-500 text-center text-sm mb-8 leading-5 px-4">
                                {t(bodyKey)}
                            </Text>

                            {/* Action Button */}
                            <TouchableOpacity
                                onPress={handleToggle}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                {isLoading ? (
                                    <View className="w-full h-14 bg-gray-100 rounded-full items-center justify-center">
                                        <ActivityIndicator color="#9ca3af" />
                                    </View>
                                ) : currentlyEnabled ? (
                                    <View className="w-full h-14 bg-red-500 rounded-full items-center justify-center">
                                        <Text className="text-white font-bold text-base">
                                            {t(buttonKey)}
                                        </Text>
                                    </View>
                                ) : (
                                    <RainbowBorder
                                        borderRadius={9999}
                                        borderWidth={2}
                                        className="h-14"
                                        containerClassName="items-center justify-center"
                                    >
                                        <Text className="text-black font-bold text-base">
                                            {t(buttonKey)}
                                        </Text>
                                    </RainbowBorder>
                                )}
                            </TouchableOpacity>

                            {/* Cancel */}
                            <View className="items-center mt-6">
                                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                                    <Text className="text-gray-400 text-sm">
                                        {t("common.cancel")}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
