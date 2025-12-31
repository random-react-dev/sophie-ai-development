import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, ChevronRight, CreditCard, Globe, Lock, LogOut, Shield, Trash2, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChangePasswordModal from '@/components/profile/ChangePasswordModal';
import CountryPicker from '@/components/profile/CountryPicker';
import LanguagePicker from '@/components/profile/LanguagePicker';
import { setAppLanguage } from '@/services/i18n';
import { uploadAvatar } from '@/services/supabase/storage';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut, updateProfile } = useAuthStore();

    // Local State
    const [isLoading, setIsLoading] = useState(false);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [name, setName] = useState(user?.user_metadata?.full_name || '');
    const [isEditingName, setIsEditingName] = useState(false);

    // Modals
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleAvatarUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && user) {
            setIsAvatarUploading(true);
            try {
                const publicUrl = await uploadAvatar(user.id, result.assets[0].uri);
                if (publicUrl) {
                    await updateProfile({ avatar_url: publicUrl });
                    Alert.alert("Success", "Avatar updated successfully!");
                } else {
                    Alert.alert("Error", "Failed to upload avatar.");
                }
            } catch (error) {
                Alert.alert("Error", "An unexpected error occurred.");
            } finally {
                setIsAvatarUploading(false);
            }
        }
    };

    const handleUpdateName = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            await updateProfile({ full_name: name });
            setIsEditingName(false);
        } catch (error) {
            Alert.alert("Error", "Failed to update name.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateCountry = async (country: string) => {
        setIsLoading(true);
        try {
            await updateProfile({ country });
            setShowCountryPicker(false);
        } catch (error) {
            Alert.alert("Error", "Failed to update country.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateLanguage = async (lang: string) => {
        setIsLoading(true);
        try {
            await setAppLanguage(lang);
            await updateProfile({ app_language: lang });
            setShowLanguagePicker(false);
        } catch (error) {
            Alert.alert("Error", "Failed to update language.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                        router.replace('/(auth)/login' as any);
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center border-b border-gray-100 bg-white">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">My Profile</Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Basic Info Section */}
                <View className="bg-white p-6 mb-6">
                    <View className="items-center mb-6">
                        <TouchableOpacity onPress={handleAvatarUpload} className="relative">
                            <View className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-sm">
                                {user?.user_metadata?.avatar_url ? (
                                    <Image source={{ uri: user.user_metadata.avatar_url }} className="w-full h-full" transition={200} />
                                ) : (
                                    <View className="w-full h-full items-center justify-center bg-blue-50">
                                        <Text className="text-2xl font-bold text-blue-500">
                                            {user?.email?.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full border-2 border-white shadow-sm">
                                {isAvatarUploading ? <ActivityIndicator size="small" color="white" /> : <Camera size={14} color="white" />}
                            </View>
                        </TouchableOpacity>

                        <View className="flex-row items-center mt-4">
                            {isEditingName ? (
                                <View className="flex-row items-center gap-2">
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-lg font-bold text-gray-900 min-w-[200px] text-center"
                                        autoFocus
                                        onBlur={handleUpdateName}
                                        onSubmitEditing={handleUpdateName}
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => setIsEditingName(true)}>
                                    <Text className="text-xl font-bold text-gray-900 text-center">{user?.user_metadata?.full_name || 'Set Name'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
                    </View>

                    <View className="space-y-4">
                        <TouchableOpacity
                            onPress={() => setShowCountryPicker(true)}
                            className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"
                        >
                            <View className="flex-row items-center gap-3">
                                <Globe size={20} color="#64748b" />
                                <View>
                                    <Text className="text-xs text-gray-500 font-medium">Country</Text>
                                    <Text className="text-base font-semibold text-gray-900">{user?.user_metadata?.country || 'Not set'}</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowLanguagePicker(true)}
                            className="flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"
                        >
                            <View className="flex-row items-center gap-3">
                                <Globe size={20} color="#64748b" />
                                <View>
                                    <Text className="text-xs text-gray-500 font-medium">App Language</Text>
                                    <Text className="text-base font-semibold text-gray-900">
                                        {user?.user_metadata?.app_language === 'hi' ? 'Hindi' :
                                            user?.user_metadata?.app_language === 'es' ? 'Spanish' : 'English'}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Section */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Account</Text>
                    <View className="bg-white rounded-3xl overflow-hidden shadow-sm shadow-gray-100 border border-gray-100">
                        <View className="p-4 border-b border-gray-50 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <User size={20} color="#3b82f6" />
                                <Text className="text-base font-semibold text-gray-900">Status</Text>
                            </View>
                            <View className="bg-yellow-100 px-3 py-1 rounded-full">
                                <Text className="text-yellow-700 text-xs font-bold uppercase">Free Trial</Text>
                            </View>
                        </View>

                        <TouchableOpacity className="p-4 border-b border-gray-50 flex-row items-center justify-between bg-blue-50/50">
                            <View className="flex-row items-center gap-3">
                                <CreditCard size={20} color="#3b82f6" />
                                <Text className="text-base font-semibold text-blue-600">Upgrade to Pro</Text>
                            </View>
                            <ChevronRight size={20} color="#93c5fd" />
                        </TouchableOpacity>

                        <TouchableOpacity disabled className="p-4 border-b border-gray-50 flex-row items-center justify-between opacity-50">
                            <View className="flex-row items-center gap-3">
                                <CreditCard size={20} color="#94a3b8" />
                                <Text className="text-base font-semibold text-gray-500">Payment Methods</Text>
                            </View>
                            <Text className="text-xs text-gray-400">Coming Soon</Text>
                        </TouchableOpacity>

                        <TouchableOpacity disabled className="p-4 flex-row items-center justify-between opacity-50">
                            <View className="flex-row items-center gap-3">
                                <CreditCard size={20} color="#94a3b8" />
                                <Text className="text-base font-semibold text-gray-500">Billing History</Text>
                            </View>
                            <Text className="text-xs text-gray-400">Coming Soon</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Security Section */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Security</Text>
                    <View className="bg-white rounded-3xl overflow-hidden shadow-sm shadow-gray-100 border border-gray-100">
                        <TouchableOpacity
                            onPress={() => setShowPasswordModal(true)}
                            className="p-4 border-b border-gray-50 flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center gap-3">
                                <Lock size={20} color="#64748b" />
                                <Text className="text-base font-semibold text-gray-900">Change Password</Text>
                            </View>
                            <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        <View className="p-4 border-b border-gray-50 flex-row items-center justify-between opacity-50">
                            <View className="flex-row items-center gap-3">
                                <Shield size={20} color="#64748b" />
                                <Text className="text-base font-semibold text-gray-500">Two-Factor Auth</Text>
                            </View>
                            <Text className="text-xs text-gray-400">Not Enabled</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleLogout}
                            className="p-4 flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center gap-3">
                                <LogOut size={20} color="#ef4444" />
                                <Text className="text-base font-semibold text-red-500">Log Out</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Privacy Section */}
                <View className="px-6 mb-8">
                    <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-2">Privacy & Legal</Text>
                    <View className="bg-white rounded-3xl overflow-hidden shadow-sm shadow-gray-100 border border-gray-100">
                        <TouchableOpacity onPress={() => Alert.alert("Coming Soon")} className="p-4 border-b border-gray-50 flex-row items-center justify-between">
                            <Text className="text-base font-semibold text-gray-900">Privacy Policy</Text>
                            <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert("Coming Soon")} className="p-4 flex-row items-center justify-between">
                            <Text className="text-base font-semibold text-gray-900">Terms of Service</Text>
                            <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => Alert.alert("Delete Account", "This feature is coming soon.")} className="mt-6 flex-row items-center justify-center gap-2 opacity-50">
                        <Trash2 size={16} color="#ef4444" />
                        <Text className="text-red-500 font-medium text-sm">Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Modals */}
            <CountryPicker
                visible={showCountryPicker}
                onClose={() => setShowCountryPicker(false)}
                onSelect={handleUpdateCountry}
                selectedCountry={user?.user_metadata?.country}
            />

            <LanguagePicker
                visible={showLanguagePicker}
                onClose={() => setShowLanguagePicker(false)}
                onSelect={handleUpdateLanguage}
                selectedLang={user?.user_metadata?.app_language}
            />

            <ChangePasswordModal
                visible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </SafeAreaView>
    );
}
