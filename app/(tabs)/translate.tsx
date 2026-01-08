import LanguagePickerModal from '@/components/translate/LanguagePickerModal';
import { DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG, Language } from '@/constants/languages';
import { translateText } from '@/services/gemini/translate';
import { saveToVocabulary } from '@/services/supabase/vocabulary';
import { useAuthStore } from '@/stores/authStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import {
    ArrowRightLeft,
    Bookmark,
    ChevronDown,
    Copy,
    MessageSquare,
    Mic,
    Sparkles, Trash2,
    Volume2
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView, Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TranslateScreen() {
    const { user } = useAuthStore();
    const { setPracticePhrase } = useScenarioStore();
    const router = useRouter();

    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);

    const [sourceLang, setSourceLang] = useState<Language>(DEFAULT_SOURCE_LANG);
    const [targetLang, setTargetLang] = useState<Language>(DEFAULT_TARGET_LANG);

    // Modal states
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [showTargetPicker, setShowTargetPicker] = useState(false);

    const handleSwap = useCallback(() => {
        Haptics.selectionAsync();
        const temp = sourceLang;
        setSourceLang(targetLang);
        setTargetLang(temp);

        // If there's already a translation, swap the texts too
        if (translatedText) {
            setInputText(translatedText);
            setTranslatedText(inputText);
        }
    }, [sourceLang, targetLang, inputText, translatedText]);

    const handleTranslate = async () => {
        if (!inputText.trim()) return;

        setIsTranslating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = await translateText(inputText, targetLang.name, sourceLang.name);
            setTranslatedText(result);
        } catch (error) {
            console.error('Translation error:', error);
            Alert.alert("Error", "Failed to translate. Please try again.");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        if (!translatedText) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const success = await saveToVocabulary({
            phrase: inputText,
            translation: translatedText,
            context: `${sourceLang.name} → ${targetLang.name}`
        });

        if (success) {
            Alert.alert("Saved!", "Added to your vocabulary");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Alert.alert("Error", "Failed to save. Please try again.");
        }
    };

    const handlePractice = () => {
        if (!translatedText) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setPracticePhrase(translatedText);
        router.push('/(tabs)/talk');
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Copied", "Text copied to clipboard");
    };

    const clearAll = () => {
        setInputText('');
        setTranslatedText('');
        Haptics.selectionAsync();
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
            <View className="px-6 py-4 mb-2 flex-row justify-center items-center relative">
                <View className="items-center">
                    <Text className="text-black text-2xl font-bold">Sophie AI</Text>
                    <Text className="text-gray-500 text-base font-medium">Native speaker in your pocket</Text>
                </View>
                <Link href="/profile" asChild>
                    <TouchableOpacity className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 absolute left-6">
                        {user?.user_metadata?.avatar_url ? (
                            <Image source={{ uri: user.user_metadata.avatar_url }} className="w-full h-full" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-blue-50">
                                <Text className="text-blue-500 font-bold">{user?.email?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Link>
            </View>

            <View className="px-6 mb-8">
                <Text className="text-4xl font-bold text-black text-left">Translate</Text>
                <Text className="text-gray-500 text-lg font-medium mt-1 text-left">Translate text to another language</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 px-4"
            >
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                    {/* Language Selector Bar */}
                    <View className="bg-white rounded-full shadow-lg">
                        <View className="flex-row items-center justify-between p-4">
                            {/* Source Language */}
                            <TouchableOpacity
                                onPress={() => setShowSourcePicker(true)}
                                className="flex-1 flex-row items-center gap-1"
                            >
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-2xl">{sourceLang.flag}</Text>
                                    <Text className="text-gray-900 font-semibold text-base">{sourceLang.name}</Text>
                                </View>
                                <ChevronDown size={16} color="gray" />
                            </TouchableOpacity>

                            {/* Swap Button */}
                            <TouchableOpacity
                                onPress={handleSwap}
                                className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mx-4"
                            >
                                <ArrowRightLeft size={18} color="#3b82f6"  />
                            </TouchableOpacity>

                            {/* Target Language */}
                            <TouchableOpacity
                                onPress={() => setShowTargetPicker(true)}
                                className="flex-1 flex-row items-center justify-end gap-1"
                            >
                                <ChevronDown size={16} color="gray" className="mr-1" />
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-gray-900 font-semibold text-base">{targetLang.name}</Text>
                                    <Text className="text-2xl">{targetLang.flag}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View className="mt-3">
                        <Text className="text-gray-400 text-base font-medium text-center">Tap swap to reverse direction</Text>
                    </View>

                    {/* Input Section - Clean, no visible border */}
                    <View className="bg-white rounded-2xl shadow-lg mt-6">
                        <View className="p-4 min-h-[160px]">
                            <TextInput
                                placeholder="Enter text to translate..."
                                multiline
                                className="text-gray-900 text-lg"
                                value={inputText}
                                onChangeText={(text) => {
                                    setInputText(text);
                                    if (!text) setTranslatedText('');
                                }}
                                placeholderTextColor="gray"
                                scrollEnabled={false}
                            />
                        </View>

                        {/* Input Actions */}
                        <View className="flex-row items-center justify-between px-5 pb-4">
                            <View className="flex-row gap-2">
                                <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
                                    <Mic size={18} color="#6b7280" />
                                </TouchableOpacity>
                                {inputText.length > 0 && (
                                    <TouchableOpacity
                                        onPress={clearAll}
                                        className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
                                    >
                                        <Trash2 size={18} color="#6b7280" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Translate Button */}
                            <TouchableOpacity
                                onPress={handleTranslate}
                                disabled={isTranslating || !inputText.trim()}
                                className={`px-6 py-3 rounded-full flex-row items-center gap-2 ${isTranslating || !inputText.trim()
                                    ? 'bg-gray-200'
                                    : 'bg-blue-500'
                                    }`}
                            >
                                {isTranslating ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <>
                                        <Sparkles size={16} color={!inputText.trim() ? "#9ca3af" : "white"} />
                                        <Text className={`font-semibold ${!inputText.trim() ? 'text-gray-400' : 'text-white'
                                            }`}>
                                            Translate
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Output Section */}
                    {translatedText ? (
                        <View className="bg-white mt-3 rounded-2xl shadow-sm shadow-gray-200 border border-blue-100">
                            <View className="p-5">
                                <View className="flex-row items-center gap-2 mb-3">
                                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                                    <Text className="text-blue-500 text-xs font-bold uppercase tracking-wider">
                                        {targetLang.name}
                                    </Text>
                                </View>

                                <Text className="text-lg text-gray-900 leading-relaxed">
                                    {translatedText}
                                </Text>
                            </View>

                            {/* Output Actions */}
                            <View className="flex-row items-center gap-2 px-5 pb-4 flex-wrap">
                                <TouchableOpacity
                                    onPress={() => copyToClipboard(translatedText)}
                                    className="flex-row items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-full"
                                >
                                    <Copy size={14} color="#6b7280" />
                                    <Text className="text-gray-600 font-medium text-sm">Copy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-full"
                                >
                                    <Volume2 size={14} color="#6b7280" />
                                    <Text className="text-gray-600 font-medium text-sm">Listen</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSave}
                                    className="flex-row items-center gap-2 bg-blue-50 px-4 py-2.5 rounded-full"
                                >
                                    <Bookmark size={14} color="#3b82f6" />
                                    <Text className="text-blue-600 font-medium text-sm">Save</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handlePractice}
                                    className="flex-row items-center gap-2 bg-blue-500 px-4 py-2.5 rounded-full"
                                >
                                    <MessageSquare size={14} color="white" />
                                    <Text className="text-white font-medium text-sm">Practice</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}

                    <View className="h-32" />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Language Picker Modals */}
            <LanguagePickerModal
                visible={showSourcePicker}
                onClose={() => setShowSourcePicker(false)}
                onSelect={setSourceLang}
                selectedCode={sourceLang.code}
                title="Translate from"
            />

            <LanguagePickerModal
                visible={showTargetPicker}
                onClose={() => setShowTargetPicker(false)}
                onSelect={setTargetLang}
                selectedCode={targetLang.code}
                title="Translate to"
            />
        </SafeAreaView>
    );
}
