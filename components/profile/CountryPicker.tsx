import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CountryPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (country: string) => void;
    selectedCountry?: string;
}

const COUNTRIES = [
    "United States", "India", "United Kingdom", "Canada", "Australia",
    "Germany", "France", "Japan", "Brazil", "China", "Italy", "Spain",
    "Mexico", "Russia", "South Korea", "Indonesia", "Netherlands",
    "Turkey", "Saudi Arabia", "Switzerland"
].sort();

export default function CountryPicker({ visible, onClose, onSelect, selectedCountry }: CountryPickerProps) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                    <Text className="text-xl font-bold text-gray-900">Select Country</Text>
                    <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                        <X size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                    {COUNTRIES.map((country) => (
                        <TouchableOpacity
                            key={country}
                            onPress={() => onSelect(country)}
                            className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${selectedCountry === country
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-white border-gray-100'
                                }`}
                        >
                            <Text className={`text-base font-semibold ${selectedCountry === country ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                {country}
                            </Text>
                            {selectedCountry === country && (
                                <View className="bg-blue-500 rounded-full p-1">
                                    <Check size={12} color="white" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
