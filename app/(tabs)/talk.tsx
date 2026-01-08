import { RainbowWave } from '@/components/lesson/RainbowWave';
import { audioStreamer } from '@/services/audio/streamer';
import { audioRecorder } from '@/services/audio/recorder';
import { translateText } from '@/services/gemini/translate';
import { geminiWebSocket } from '@/services/gemini/websocket';
import { supabase } from '@/services/supabase/client';
import { saveToVocabulary } from '@/services/supabase/vocabulary';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Bookmark, CheckCircle2, Globe, Mic, RotateCcw, Wand2 } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logger } from '@/services/common/Logger';

const TAG = 'TalkTab';

export default function TalkScreen() {
    const {
        connectionState, error, isListening, isSpeaking, volumeLevel,
        messages, showTranscript, isConversationActive,
        setShowTranscript, clearMessages, setHasGreeted, stopConversation
    } = useConversationStore();
    const { selectedScenario, selectScenario, practicePhrase, setPracticePhrase } = useScenarioStore();
    const { session, user } = useAuthStore();
    const scrollViewRef = useRef<ScrollView>(null);
    const isInitialized = useRef(false);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            if (!session || isInitialized.current) return;
            isInitialized.current = true;

            try {
                Logger.info(TAG, 'Initializing Gemini session...');
                let token = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

                if (!token) {
                    const { data, error } = await supabase.functions.invoke('get-gemini-session');
                    if (error || !data?.token) throw new Error(error?.message || "No token returned");
                    token = data.token;
                }

                if (!isMounted) return;

                let instruction = "You are Sophie, a friendly AI language tutor. When the user makes a mistake, provide a 'Natural Correction' first, then explain why briefly. Keep responses very concise. Use simple vocabulary. Your goal is to help the user practice natural conversation.";

                if (practicePhrase) {
                    instruction = `You are Sophie, a friendly AI language tutor. The user wants to practice the phrase: "${practicePhrase}". 
Your goal is to help them use this phrase in a natural conversation. 
Start by greeting them and asking if they want to try using that phrase or if they need help understanding it.
Keep responses concise. If the user makes a mistake, provide a 'Natural Correction'.`;
                } else if (selectedScenario) {
                    instruction = `You are Sophie, a friendly AI language tutor. You are in a roleplay scenario.
Scenario: ${selectedScenario.title}
Your Role: ${selectedScenario.sophieRole}
User Role: ${selectedScenario.userRole}
Level: ${selectedScenario.level}
Context: ${selectedScenario.context}
Topic: ${selectedScenario.topic}

Stay in character. Your target language level should be ${selectedScenario.level}. 
Keep responses concise. If the user makes a mistake, provide a 'Natural Correction'.`;
                }

                Logger.info(TAG, `Connecting WebSocket with ${practicePhrase ? 'practice phrase' : selectedScenario ? 'scenario' : 'default'}: ${practicePhrase || selectedScenario?.title || 'None'}`);
                geminiWebSocket.connect(token, instruction);
            } catch (err) {
                if (isMounted) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    Logger.error(TAG, 'Gemini session initialization error', err);
                    Alert.alert("Error", errorMessage);
                }
            }
        };

        initSession();

        return () => {
            isMounted = false;
            Logger.info(TAG, 'Cleaning up Talk Hub...');
            geminiWebSocket.disconnect();
            audioRecorder.stop().catch(() => { /* ignore */ });
            audioStreamer.clearQueue();
            isInitialized.current = false;
        };
    }, [session?.user?.id, session, selectedScenario, practicePhrase]);

    const getStatusText = (): string => {
        if (isSpeaking) return 'Sophie Speaking';
        if (isListening && isConversationActive) return 'Listening';
        if (isConversationActive) return 'Conversation Active';
        switch (connectionState) {
            case 'idle': return 'Ready';
            case 'connecting': return 'Connecting...';
            case 'connected': return 'Tap mic to start';
            case 'reconnecting': return 'Reconnecting...';
            case 'error': return error || 'Error';
        }
    };

    const getDotColor = (): string => {
        if (isSpeaking) return 'bg-purple-500';
        if (isListening) return 'bg-blue-500';
        if (isConversationActive) return 'bg-green-500';
        switch (connectionState) {
            case 'idle': return 'bg-gray-400';
            case 'connecting':
            case 'reconnecting': return 'bg-orange-500';
            case 'connected': return 'bg-green-500';
            case 'error': return 'bg-red-500';
        }
    };

    useEffect(() => {
        if (showTranscript) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages, showTranscript]);

    const handleFinish = () => {
        if (messages.length === 0) {
            Alert.alert("End Session", "Go back to scenario library?", [
                { text: "Cancel", style: "cancel" },
                { text: "Yes", onPress: () => router.push('/(tabs)') }
            ]);
            return;
        }

        Alert.alert(
            "Finish Conversation",
            "Are you done with this practice session?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Finish",
                    onPress: () => {
                        router.push('/report' as any);
                    }
                }
            ]
        );
    };

    const handleReset = () => {
        Alert.alert(
            "Reset Chat",
            "This will clear the current conversation and reset Sophie. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        await stopConversation();
                        clearMessages();
                        setHasGreeted(false);
                        selectScenario(null);
                        setPracticePhrase(null);
                        // Force reconnect
                        geminiWebSocket.disconnect();
                        isInitialized.current = false;
                    }
                }
            ]
        );
    };

    const handleTranslate = async (text: string) => {
        try {
            const translated = await translateText(text, 'English');
            Alert.alert("Translation", translated);
        } catch {
            Alert.alert("Error", "Failed to translate. Please try again.");
        }
    };

    const handleSaveVocabulary = async (text: string) => {
        const success = await saveToVocabulary({ phrase: text });
        if (success) {
            Alert.alert("Success", "Added to your vocabulary!");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View className="flex-1 mr-4">
                    <Text className="text-2xl font-bold text-gray-900 tracking-tight">Sophie AI</Text>
                    <Text className="text-gray-400 text-xs font-medium uppercase tracking-widest" numberOfLines={1}>
                        {practicePhrase ? `Practicing: ${practicePhrase}` : selectedScenario ? `${selectedScenario.title} • ${selectedScenario.level}` : 'Daily Practice'}
                    </Text>
                </View>
                <Link href="/profile" asChild>
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200/50">
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

            {/* Main Interaction Area */}
            <View className="flex-1 px-6">
                <View className="flex-row justify-between items-center mb-4 px-2">
                    <View className="flex-row items-center gap-2">
                        <View className={`w-2 h-2 rounded-full ${getDotColor()} ${isListening ? 'animate-pulse' : ''}`} />
                        <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{getStatusText()}</Text>
                    </View>

                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={handleReset} className="p-2 bg-gray-50 rounded-full border border-gray-100">
                            <RotateCcw size={14} color="#94a3b8" />
                        </TouchableOpacity>

                        <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-tighter mr-2">Transcript</Text>
                            <Switch
                                value={showTranscript}
                                onValueChange={setShowTranscript}
                                trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
                                thumbColor="#fff"
                                ios_backgroundColor="#E2E8F0"
                                style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }}
                            />
                        </View>
                    </View>
                </View>

                <View className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 h-[280px] justify-center items-center overflow-hidden">
                    <RainbowWave isListening={isListening} isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
                    <View className="absolute bottom-8 items-center">
                        <Text className="text-gray-300 text-xs font-medium tracking-wide italic">
                            {isSpeaking ? "Sophie is responding..." : isConversationActive ? "Speak naturally - I'm listening..." : "Tap the mic below to start"}
                        </Text>
                    </View>
                </View>

                <View className="flex-1 mt-6">
                    <ScrollView
                        ref={scrollViewRef}
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        {messages.length === 0 ? (
                            <View className="items-center mt-10">
                                <View className="w-16 h-16 rounded-3xl bg-blue-50 items-center justify-center mb-4">
                                    <Mic size={32} color="#3B82F6" opacity={0.3} />
                                </View>
                                <Text className="text-gray-300 font-medium text-center px-10 leading-5">
                                    Tap the large mic below to start your {selectedScenario ? 'roleplay' : 'practice'}.
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg) => (
                                <View key={msg.id} className={`mb-6 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <View className={`p-4 rounded-3xl max-w-[85%] ${msg.role === 'user' ? 'bg-gray-100' : 'bg-white border border-gray-100 shadow-sm'}`}>
                                        {msg.role === 'model' && (
                                            <View className="flex-row items-center gap-1 mb-1">
                                                <Wand2 size={10} color="#3b82f6" />
                                                <Text className="text-blue-500 text-[8px] font-black uppercase tracking-widest">Natural Correction</Text>
                                            </View>
                                        )}
                                        <Text className="text-gray-900 text-base font-medium leading-relaxed">{msg.text}</Text>
                                        <View className="flex-row mt-2 gap-4 border-t border-gray-50 pt-2">
                                            <TouchableOpacity className="flex-row items-center gap-1" onPress={() => handleTranslate(msg.text)}>
                                                <Globe size={12} color="#94a3b8" />
                                                <Text className="text-[10px] text-gray-400 font-bold">Translate</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity className="flex-row items-center gap-1" onPress={() => handleSaveVocabulary(msg.text)}>
                                                <Bookmark size={12} color="#94a3b8" />
                                                <Text className="text-[10px] text-gray-400 font-bold">Save</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>

            {/* Floating Action Button for Finish */}
            {messages.length > 0 && (
                <View className="px-6 pb-10 items-center">
                    <TouchableOpacity
                        onPress={handleFinish}
                        className="px-8 py-4 bg-gray-900 rounded-3xl flex-row items-center gap-3 shadow-xl"
                    >
                        <CheckCircle2 size={20} color="white" />
                        <Text className="text-white font-bold text-base">Finish & Get Report</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Pad for the Tab Bar Mic Button */}
            <View className="h-20" />
        </SafeAreaView>
    );
}
