import { useConversationStore } from '@/stores/conversationStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { saveToVocabulary } from '@/services/supabase/vocabulary';
import { useRouter } from 'expo-router';
import { Bookmark, MessageSquare, Sparkles, X } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportScreen() {
    const { messages, clearMessages } = useConversationStore();
    const { selectedScenario } = useScenarioStore();
    const router = useRouter();

    const handleSave = async (text: string) => {
        const success = await saveToVocabulary({ phrase: text });
        if (success) {
            Alert.alert("Saved", "Added to your vocabulary!");
        }
    };

    const handleClose = () => {
        clearMessages();
        router.replace('/(tabs)/talk' as any);
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-50">
                <Text className="text-xl font-bold text-gray-900">Session Report</Text>
                <TouchableOpacity onPress={handleClose} className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
                    <X size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                {/* Summary Card */}
                <View className="bg-blue-50 rounded-[32px] p-6 mb-8 border border-blue-100/50">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="w-10 h-10 rounded-2xl bg-blue-500 items-center justify-center">
                            <Sparkles size={20} color="white" />
                        </View>
                        <View>
                            <Text className="text-blue-900 font-bold">Practice Summary</Text>
                            <Text className="text-blue-600 text-xs">Great job practicing your {selectedScenario?.level || 'skills'}!</Text>
                        </View>
                    </View>
                    <Text className="text-blue-800 text-base leading-relaxed">
                        You practiced {selectedScenario?.title || 'General Conversation'}. You successfully managed {messages.length} turns of conversation. Your fluency is improving!
                    </Text>
                </View>

                {/* Statistics Row */}
                <View className="flex-row gap-4 mb-8">
                    <View className="flex-1 bg-gray-50 rounded-[24px] p-4 border border-gray-100">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Messages</Text>
                        <Text className="text-2xl font-bold text-gray-900">{messages.length}</Text>
                    </View>
                    <View className="flex-1 bg-gray-50 rounded-[24px] p-4 border border-gray-100">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Duration</Text>
                        <Text className="text-2xl font-bold text-gray-900">~2m</Text>
                    </View>
                </View>

                {/* Transcript Section */}
                <View className="flex-row items-center gap-2 mb-4">
                    <MessageSquare size={18} color="#94a3b8" />
                    <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">Full Transcript</Text>
                </View>

                {messages.map((msg) => (
                    <View key={msg.id} className="mb-6 pb-6 border-b border-gray-50">
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className={`text-[10px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-500'}`}>
                                {msg.role === 'user' ? 'You' : 'Sophie'}
                            </Text>
                            <TouchableOpacity onPress={() => handleSave(msg.text)}>
                                <Bookmark size={14} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-gray-900 text-base font-medium leading-relaxed">{msg.text}</Text>
                    </View>
                ))}

                <View className="h-20" />
            </ScrollView>

            <View className="px-6 py-8">
                <TouchableOpacity 
                    onPress={handleClose}
                    className="w-full h-16 bg-gray-900 rounded-3xl items-center justify-center shadow-xl shadow-gray-200"
                >
                    <Text className="text-white font-bold text-lg">Continue to Library</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
