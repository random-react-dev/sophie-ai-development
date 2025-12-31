import { getLocales } from 'expo-localization';
import { ChevronDown, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';

interface CountryPickerProps {
    value: string;
    onSelect: (country: string) => void;
}

const COMMON_COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia",
    "India", "Germany", "France", "Spain", "Italy", "Japan",
    "China", "Brazil", "Mexico", "Russia", "South Korea"
];

export function CountryPicker({ value, onSelect }: CountryPickerProps) {
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (!value) {
            const locales = getLocales();
            if (locales && locales.length > 0) {
                const regionCode = locales[0].regionCode;
                // Simple mapping for prototype - in real app use a full library
                const countryMap: Record<string, string> = {
                    'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada',
                    'AU': 'Australia', 'IN': 'India', 'DE': 'Germany',
                    'FR': 'France', 'ES': 'Spain', 'IT': 'Italy',
                    'JP': 'Japan', 'CN': 'China', 'BR': 'Brazil',
                    'MX': 'Mexico', 'RU': 'Russia', 'KR': 'South Korea'
                };
                if (regionCode && countryMap[regionCode]) {
                    onSelect(countryMap[regionCode]);
                }
            }
        }
    }, [value, onSelect]);

    return (
        <View>
            <TouchableOpacity
                className="flex-row items-center justify-between w-full bg-gray-100 rounded-xl px-4 py-4"
                onPress={() => setModalVisible(true)}
            >
                <Text className={`text-base ${value ? 'text-gray-800' : 'text-gray-400'}`}>
                    {value || "Select Country"}
                </Text>
                <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[70%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-800">Select Country</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2">
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={COMMON_COUNTRIES}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className="p-4 border-b border-gray-50 active:bg-gray-50"
                                    onPress={() => {
                                        onSelect(item);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text className={`text-base ${item === value ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            className="flex-1"
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
