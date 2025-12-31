import { ChevronDown, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';

interface LanguagePickerProps {
    value: string;
    onSelect: (language: string) => void;
    label?: string;
    placeholder?: string;
}

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Russian", "Japanese", "Chinese (Mandarin)",
    "Korean", "Hindi", "Arabic", "Turkish", "Dutch"
];

export function LanguagePicker({ value, onSelect, label, placeholder = "Select Language" }: LanguagePickerProps) {
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <View className="w-full">
            {label && <Text className="text-sm font-medium text-gray-700 mb-1.5 ml-1">{label}</Text>}

            <TouchableOpacity
                className="flex-row items-center justify-between w-full bg-gray-100 rounded-xl px-4 py-4"
                onPress={() => setModalVisible(true)}
            >
                <Text className={`text-base ${value ? 'text-gray-800' : 'text-gray-400'}`}>
                    {value || placeholder}
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
                    <View className="bg-white rounded-t-3xl h-[60%]">
                        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-800">{label || "Select Language"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2">
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={LANGUAGES}
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
