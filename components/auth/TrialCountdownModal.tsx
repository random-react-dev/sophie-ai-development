import React from 'react';
import { Modal, Text, View, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '../common/Button';
import { Ionicons } from '@expo/vector-icons';

export const TrialCountdownModal = () => {
    const { user, showTrialPopup, setShowTrialPopup } = useAuthStore();

    if (!user || !showTrialPopup) return null;

    const calculateTrialStatus = (createdAt: string) => {
        const createdDate = new Date(createdAt);
        const now = new Date();
        const diffInMs = now.getTime() - createdDate.getTime();
        const daysPassed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const dayNumber = Math.min(Math.max(daysPassed + 1, 1), 7);
        
        return {
            dayNumber,
            remainingDays: 8 - dayNumber,
            discount: Math.max(0, (7 - dayNumber) * 10),
            isLastDay: dayNumber === 7
        };
    };

    const { remainingDays, discount, isLastDay } = calculateTrialStatus(user.created_at);

    const handleClose = () => {
        setShowTrialPopup(false);
    };

    const handleUpgrade = () => {
        // Placeholder for upgrade logic (e.g., navigate to subscription screen)
        setShowTrialPopup(false);
    };

    return (
        <Modal
            visible={showTrialPopup}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
                <View className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative">
                    <TouchableOpacity 
                        onPress={handleClose}
                        className="absolute right-6 top-6 z-10 p-2"
                    >
                        <Ionicons name="close" size={24} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View className="items-center mb-6">
                        <View className="w-20 h-20 bg-blue-50 rounded-full items-center justify-center mb-4">
                            <Ionicons name="gift-outline" size={40} color="#3B82F6" />
                        </View>
                        <Text className="text-3xl font-bold text-gray-900 text-center">
                            {isLastDay ? "Last Day!" : `${remainingDays} Days Left`}
                        </Text>
                        <Text className="text-gray-500 text-center mt-2 text-lg">
                            {isLastDay 
                                ? "Your free trial ends today. Unlock full access to continue learning!" 
                                : `Enjoy your 7-day free trial of Sophie AI.`}
                        </Text>
                    </View>

                    {!isLastDay && (
                        <View className="bg-blue-50 rounded-2xl p-6 mb-6 items-center border border-blue-100">
                            <Text className="text-blue-600 font-semibold uppercase tracking-wider text-xs">Limited Time Offer</Text>
                            <Text className="text-4xl font-black text-blue-700 mt-1">{discount}% OFF</Text>
                            <Text className="text-blue-500 text-sm mt-1 font-medium">Claim your discount today</Text>
                        </View>
                    )}

                    <View className="space-y-3">
                        <Button 
                            title={isLastDay ? "Upgrade Now" : "Claim My Discount"} 
                            onPress={handleUpgrade}
                            className="h-14 rounded-2xl bg-blue-600 shadow-md"
                        />
                        <TouchableOpacity 
                            onPress={handleClose}
                            className="h-12 items-center justify-center"
                        >
                            <Text className="text-gray-400 font-semibold">Maybe later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
