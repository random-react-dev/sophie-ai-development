import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface LanguagePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (lang: string) => void;
    selectedLang?: string;
}

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'es', name: 'Spanish', native: 'Español' },
];

export default function LanguagePicker({ visible, onClose, onSelect, selectedLang }: LanguagePickerProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-[32px] overflow-hidden">
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                        <Text className="text-xl font-bold text-gray-900">App Language</Text>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <View className="p-6 pb-12 space-y-3">
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                onPress={() => onSelect(lang.code)}
                                className={`flex-row items-center justify-between p-4 rounded-2xl border ${selectedLang === lang.code
                                        ? 'bg-blue-50 border-blue-500'
                                        : 'bg-white border-gray-100'
                                    }`}
                            >
                                <View>
                                    <Text className={`text-base font-bold ${selectedLang === lang.code ? 'text-blue-700' : 'text-gray-900'
                                        }`}>
                                        {lang.name}
                                    </Text>
                                    <Text className="text-gray-500 text-sm mt-0.5">{lang.native}</Text>
                                </View>
                                {selectedLang === lang.code && (
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
