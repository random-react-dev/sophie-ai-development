import CircleFlag from '@/components/common/CircleFlag';
import { Language, SUPPORTED_LANGUAGES } from '@/constants/languages';
import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LanguagePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (language: Language) => void;
    selectedCode?: string;
    title?: string;
}

export default function LanguagePickerModal({
    visible,
    onClose,
    onSelect,
    selectedCode,
    title = 'Select Language'
}: LanguagePickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLanguages = useMemo(() => {
        if (!searchQuery.trim()) return SUPPORTED_LANGUAGES;

        const query = searchQuery.toLowerCase();
        return SUPPORTED_LANGUAGES.filter(lang =>
            lang.name.toLowerCase().includes(query) ||
            lang.nativeName.toLowerCase().includes(query) ||
            lang.code.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleSelect = (language: Language) => {
        onSelect(language);
        setSearchQuery('');
        onClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-white"
            >
                <SafeAreaView className="flex-1">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                        <Text className="text-3xl font-bold text-black">{title}</Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleClose}
                            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
                        >
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className="p-4">
                        <View className="h-12 shadow-lg rounded-full flex-row items-center px-4 bg-gray-100">
                            <Feather name="search" size={20} color="gray" />
                            <TextInput
                                placeholder="Search languages..."
                                className="flex-1 ml-3 text-gray-900 font-medium"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="gray"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Language List */}
                    <FlatList
                        data={filteredLanguages}
                        keyExtractor={(item) => item.code}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const isSelected = item.code === selectedCode;
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => handleSelect(item)}
                                    className={`flex-row items-center py-4 px-4 rounded-2xl mb-2 gap-4 ${isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                                        }`}
                                >
                                    <CircleFlag countryCode={item.countryCode} size={28} />
                                    <View className="flex-1">
                                        <Text className={`font-bold text-base ${isSelected ? 'text-blue-500' : 'text-gray-900'
                                            }`}>
                                            {item.name}
                                        </Text>
                                        <Text className="text-gray-500 text-sm">{item.nativeName}</Text>
                                    </View>
                                    {isSelected && (
                                        <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                                            <Ionicons name="checkmark-sharp" size={16} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View className="items-center py-10">
                                <Text className="text-gray-400 font-medium">No languages found</Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
