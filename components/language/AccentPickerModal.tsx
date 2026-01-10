import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export interface Accent {
    name: string;
    countryCode: string;
    native: string;
}

export const SUPPORTED_ACCENTS: Accent[] = [
    { name: 'American', countryCode: 'us', native: 'American English' },
    { name: 'British', countryCode: 'gb', native: 'British English' },
    { name: 'Indian', countryCode: 'in', native: 'Indian English' },
    { name: 'Australian', countryCode: 'au', native: 'Australian English' },
];

interface AccentPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (accent: string) => void;
    selectedAccent?: string;
}

export default function AccentPickerModal({ visible, onClose, onSelect, selectedAccent }: AccentPickerModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-[32px] overflow-hidden">
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-900">Preferred Accent</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <View className="p-6 pb-12 ">
                        {SUPPORTED_ACCENTS.map((accent) => (
                            <TouchableOpacity
                                key={accent.name}
                                onPress={() => onSelect(accent.name)}
                                className={`flex-row items-center justify-between p-4 rounded-2xl border ${selectedAccent === accent.name
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-white border-gray-100'
                                    }`}
                            >
                                <View>
                                    <Text className={`text-base font-bold ${selectedAccent === accent.name ? 'text-blue-700' : 'text-gray-900'
                                        }`}>
                                        {accent.name}
                                    </Text>
                                    <Text className="text-gray-500 text-sm mt-0.5">{accent.native}</Text>
                                </View>
                                {selectedAccent === accent.name && (
                                    <View className="bg-blue-500 rounded-full p-1">
                                        <Check size={12} color="white" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}
