import { RainbowBorder } from "@/components/common/Rainbow";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const OTP_LENGTH = 8;
const RESEND_COOLDOWN = 60;

export default function TwoFactorOTPModal() {
    const { t } = useTranslation();
    const { pending2FA, pending2FAEmail, verify2FA, resend2FACode, signOut, isLoading } =
        useAuthStore();

    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
    const inputRef = useRef<TextInput>(null);

    // Countdown timer for resend
    useEffect(() => {
        if (!pending2FA) return;
        setResendTimer(RESEND_COOLDOWN);
        const interval = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [pending2FA]);

    // Auto-focus input when modal opens
    useEffect(() => {
        if (pending2FA) {
            setTimeout(() => inputRef.current?.focus(), 300);
            setOtp("");
            setError("");
        }
    }, [pending2FA]);

    const handleOtpChange = useCallback(
        (text: string) => {
            // Only allow digits
            const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
            setOtp(digits);
            setError("");

            // Auto-submit when all digits entered
            if (digits.length === OTP_LENGTH) {
                handleVerify(digits);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const handleVerify = async (code?: string) => {
        const token = code ?? otp;
        if (token.length !== OTP_LENGTH) return;

        try {
            await verify2FA(token);
        } catch (err: unknown) {
            const msg =
                err instanceof Error
                    ? err.message
                    : t("profile.security_screen.two_factor.otp_error_generic");
            setError(msg);
            setOtp("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleResend = async () => {
        try {
            await resend2FACode();
            setResendTimer(RESEND_COOLDOWN);
            setError("");
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to resend code";
            setError(msg);
        }
    };

    const handleCancel = async () => {
        setOtp("");
        setError("");
        await signOut();
    };

    const maskedEmail = pending2FAEmail
        ? pending2FAEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")
        : "";

    if (!pending2FA) return null;

    return (
        <Modal
            visible={pending2FA}
            animationType="slide"
            presentationStyle="fullScreen"
        >
            <View className="flex-1 bg-white">
                <SafeAreaView className="flex-1">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        className="flex-1"
                    >
                        {/* Header */}
                        <View className="flex-row justify-between items-center px-4 py-5 border-b border-gray-100">
                            <View className="flex-1 pr-4">
                                <Text className="text-xl font-bold text-gray-900">
                                    {t("profile.security_screen.two_factor.otp_title")}
                                </Text>
                            </View>
                            <Pressable
                                onPress={handleCancel}
                                className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                            >
                                <Ionicons name="close" size={24} color="black" />
                            </Pressable>
                        </View>

                        {/* Content */}
                        <View className="flex-1 px-6 pt-8">
                            {/* Icon */}
                            <View className="items-center mb-6">
                                <View className="w-20 h-20 rounded-full bg-indigo-50 items-center justify-center">
                                    <Ionicons name="mail-outline" size={36} color="#6366f1" />
                                </View>
                            </View>

                            {/* Description */}
                            <Text className="text-gray-500 text-center text-sm mb-8 leading-5">
                                {t("profile.security_screen.two_factor.otp_subtitle")}{"\n"}
                                <Text className="font-bold text-gray-700">{maskedEmail}</Text>
                            </Text>

                            {/* OTP Input Boxes */}
                            <Pressable
                                onPress={() => inputRef.current?.focus()}
                                className="flex-row justify-center gap-2 mb-6"
                            >
                                {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                                    const isActive = index === otp.length;
                                    const isFilled = index < otp.length;
                                    return (
                                        <View
                                            key={index}
                                            className={`w-10 h-12 rounded-xl border-2 items-center justify-center ${error
                                                ? "border-red-300 bg-red-50"
                                                : isActive
                                                    ? "border-indigo-400 bg-indigo-50"
                                                    : isFilled
                                                        ? "border-gray-300 bg-gray-50"
                                                        : "border-gray-200 bg-white"
                                                }`}
                                        >
                                            <Text
                                                className={`text-2xl font-bold ${error ? "text-red-500" : "text-gray-900"
                                                    }`}
                                            >
                                                {otp[index] ?? ""}
                                            </Text>
                                            {isActive && !error && (
                                                <View className="absolute bottom-2 w-5 h-0.5 bg-indigo-400 rounded-full" />
                                            )}
                                        </View>
                                    );
                                })}
                            </Pressable>

                            {/* Hidden TextInput */}
                            <TextInput
                                ref={inputRef}
                                value={otp}
                                onChangeText={handleOtpChange}
                                keyboardType="number-pad"
                                maxLength={OTP_LENGTH}
                                className="absolute opacity-0 w-0 h-0"
                                autoComplete="one-time-code"
                                textContentType="oneTimeCode"
                            />

                            {/* Error Message */}
                            {error ? (
                                <Text className="text-red-500 text-center text-sm mb-4">
                                    {error}
                                </Text>
                            ) : null}

                            {/* Verify Button */}
                            <TouchableOpacity
                                onPress={() => handleVerify()}
                                disabled={isLoading || otp.length !== OTP_LENGTH}
                                activeOpacity={0.8}
                            >
                                {isLoading || otp.length !== OTP_LENGTH ? (
                                    <View className="w-full h-14 bg-gray-100 rounded-full items-center justify-center">
                                        {isLoading ? (
                                            <ActivityIndicator color="#9ca3af" />
                                        ) : (
                                            <Text className="text-gray-400 font-bold text-base">
                                                {t("profile.security_screen.two_factor.otp_verify")}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <RainbowBorder
                                        borderRadius={9999}
                                        borderWidth={2}
                                        className="h-14"
                                        containerClassName="items-center justify-center"
                                    >
                                        <Text className="text-black font-bold text-base">
                                            {t("profile.security_screen.two_factor.otp_verify")}
                                        </Text>
                                    </RainbowBorder>
                                )}
                            </TouchableOpacity>

                            {/* Resend / Timer */}
                            <View className="items-center mt-6">
                                {resendTimer > 0 ? (
                                    <Text className="text-gray-400 text-sm">
                                        {t("profile.security_screen.two_factor.otp_resend_in", {
                                            seconds: resendTimer,
                                        })}
                                    </Text>
                                ) : (
                                    <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                                        <Text className="text-indigo-500 font-semibold text-sm">
                                            {t("profile.security_screen.two_factor.otp_resend")}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Cancel & Sign Out */}
                            <View className="items-center mt-8">
                                <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
                                    <Text className="text-gray-400 text-sm underline">
                                        {t("profile.security_screen.two_factor.cancel_and_logout")}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}
