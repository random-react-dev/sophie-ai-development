import { translateText } from '@/services/gemini/translate';
import { saveToVocabulary } from '@/services/supabase/vocabulary';
import { useAuthStore } from '@/stores/authStore';
import { Image } from 'expo-image';
import { 
    Languages, ArrowRightLeft, Copy, Bookmark, 
    Sparkles, Trash2
} from 'lucide-react-native';
import React, { useState } from 'react';
import { 
    ScrollView, Text, TextInput, TouchableOpacity, 
    View, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function TranslateScreen() {
    const { user } = useAuthStore();
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [targetLang, setTargetLanguage] = useState('English');

    const handleTranslate = async () => {
        if (!inputText.trim()) return;
        
        setIsTranslating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        try {
            const result = await translateText(inputText, targetLang === 'English' ? 'en' : 'hi'); // Simplified for prototype
            setTranslatedText(result);
        } catch {
            Alert.alert("Error", "Failed to translate text.");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSave = async () => {
        if (!translatedText) return;
        
        const success = await saveToVocabulary({
            phrase: inputText,
            translation: translatedText,
            context: 'Manual Translation'
        });

        if (success) {
            Alert.alert("Success", "Added to your vocabulary!");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Alert.alert("Copied", "Text copied to clipboard!");
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View>
                    <Text className="text-gray-400 text-sm font-medium">Sophie AI</Text>
                    <Text className="text-gray-900 text-2xl font-bold tracking-tight">Translate</Text>
                </View>
                <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200/50">
                    {user?.user_metadata?.avatar_url ? (
                        <Image source={{ uri: user.user_metadata.avatar_url }} className="w-full h-full" />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-blue-50">
                            <Text className="text-blue-500 font-bold">{user?.email?.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
                    {/* Language Toggle */}
                    <View className="flex-row items-center justify-center gap-4 mb-8 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <View className="flex-1 items-center py-2 bg-white rounded-xl shadow-sm">
                            <Text className="text-gray-900 font-bold">Auto Detect</Text>
                        </View>
                        <ArrowRightLeft size={16} color="#94a3b8" />
                        <TouchableOpacity 
                            onPress={() => setTargetLanguage(targetLang === 'English' ? 'Hindi' : 'English')}
                            className="flex-1 items-center py-2"
                        >
                            <Text className="text-blue-500 font-bold">{targetLang}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Area */}
                    <View className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm mb-6">
                        <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Input Text</Text>
                        <TextInput
                            placeholder="Type something to translate..."
                            multiline
                            className="text-xl font-medium text-gray-900 min-h-[120px] text-start align-top"
                            value={inputText}
                            onChangeText={setInputText}
                            placeholderTextColor="#cbd5e1"
                        />
                        <View className="flex-row justify-end mt-4">
                            <TouchableOpacity 
                                onPress={() => setInputText('')}
                                className="p-2"
                            >
                                <Trash2 size={18} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Translation Button */}
                    <TouchableOpacity 
                        onPress={handleTranslate}
                        disabled={isTranslating || !inputText.trim()}
                        className={`w-full h-16 rounded-3xl flex-row items-center justify-center gap-3 shadow-lg ${isTranslating || !inputText.trim() ? 'bg-gray-200' : 'bg-blue-500 shadow-blue-200'}`}
                    >
                        {isTranslating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Sparkles size={20} color="white" />
                                <Text className="text-white font-bold text-lg">Translate with AI</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Result Area */}
                    {translatedText ? (
                        <View className="mt-8 bg-blue-50/50 rounded-[32px] p-6 border border-blue-100/50 mb-10">
                            <Text className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">Translation</Text>
                            <Text className="text-xl font-bold text-blue-900 leading-relaxed">
                                {translatedText}
                            </Text>
                            
                            <View className="flex-row gap-4 mt-6 pt-6 border-t border-blue-100/50">
                                <TouchableOpacity 
                                    onPress={() => copyToClipboard(translatedText)}
                                    className="flex-row items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-blue-100 shadow-sm"
                                >
                                    <Copy size={14} color="#3b82f6" />
                                    <Text className="text-blue-600 font-bold text-xs">Copy</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    onPress={handleSave}
                                    className="flex-row items-center gap-2 bg-blue-500 px-4 py-2.5 rounded-xl shadow-md shadow-blue-200"
                                >
                                    <Bookmark size={14} color="white" fill="white" />
                                    <Text className="text-white font-bold text-xs">Save to Vocab</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View className="mt-10 items-center opacity-20">
                            <Languages size={64} color="#94a3b8" strokeWidth={1} />
                            <Text className="text-gray-400 font-medium mt-4">Translate any phrase instantly</Text>
                        </View>
                    )}
                    
                    <View className="h-24" />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
