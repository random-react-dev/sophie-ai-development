import { RainbowWave } from '@/components/lesson/RainbowWave';
import { audioPlayer } from '@/services/audio/player';
import { audioRecorder } from '@/services/audio/recorder';
import { geminiWebSocket } from '@/services/gemini/websocket';
import { translateText } from '@/services/gemini/translate';
import { saveToVocabulary } from '@/services/supabase/vocabulary';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Mic, Wand2, Globe, Bookmark } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logger } from '@/services/common/Logger';

const TAG = 'HomeScreen';

export default function HomeScreen() {
    const { 
        isConnected, isListening, isSpeaking, volumeLevel, 
        messages, showTranscript, 
        setListening, setVolumeLevel, setShowTranscript 
    } = useConversationStore();
    const { session, user } = useAuthStore();
    const [status, setStatus] = useState("Initializing...");
    const scrollViewRef = useRef<ScrollView>(null);
    const isInitialized = useRef(false);

    useEffect(() => {
        const initSession = async () => {
            if (!session || isInitialized.current) return;
            isInitialized.current = true;

            try {
                Logger.info(TAG, 'Initializing Gemini session...');
                setStatus("Connecting...");
                
                let token = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
                
                if (!token) {
                    Logger.info(TAG, 'Fetching ephemeral token from Supabase...');
                    const { data, error } = await supabase.functions.invoke('get-gemini-session');
                    if (error || !data?.token) throw new Error(error?.message || "No token returned");
                    token = data.token;
                }

                const instruction = "You are Sophie, a friendly AI language tutor. When the user makes a mistake, provide a 'Natural Correction' first, then explain why briefly. Keep responses very concise. Use simple vocabulary.";
                Logger.info(TAG, `Connecting WebSocket with instruction: ${instruction.substring(0, 30)}...`);
                geminiWebSocket.connect(token, instruction);
                setStatus("Handshaking...");
            } catch (err: any) {
                setStatus("Failed to connect");
                Logger.error(TAG, 'Gemini session initialization error', err);
                Alert.alert("Error", err.message || "Unknown error");
            }
        };

        initSession();

        return () => {
            Logger.info(TAG, 'Cleaning up HomeScreen...');
            geminiWebSocket.disconnect();
            audioRecorder.stop();
            audioPlayer.clearQueue();
            isInitialized.current = false;
        };
    }, [session]);

    useEffect(() => {
        if (showTranscript) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages, showTranscript]);

    const toggleRecording = async () => {
        Logger.info(TAG, `toggleRecording called: isListening=${isListening}, isConnected=${isConnected}`);
        
        if (isListening) {
            Logger.info(TAG, 'Stopping recording interaction...');
            await audioRecorder.stop();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setListening(false);
        } else {
            if (!isConnected) {
                Logger.warn(TAG, 'Mic interaction ignored: Sophie not connected');
                Alert.alert("Wait a moment", "Sophie is still connecting...");
                return;
            }

            try {
                Logger.info(TAG, 'Starting recording interaction...');
                await audioRecorder.start({
                    onAudioData: (base64) => {
                        geminiWebSocket.sendAudioChunk(base64);
                    },
                    onVolumeChange: (rms) => {
                        setVolumeLevel(rms);
                    }
                });
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setListening(true);
            } catch (error) {
                Logger.error(TAG, 'Failed to start recording session', error);
                Alert.alert("Microphone Error", "Could not start recording.");
            }
        }
    };

    const handleTranslate = async (text: string) => {
        Logger.info(TAG, 'Translating text...');
        const translated = await translateText(text);
        Alert.alert("Translation", translated);
    };

    const handleSaveVocabulary = async (text: string) => {
        Logger.info(TAG, 'Saving vocabulary phrase...');
        const success = await saveToVocabulary({ phrase: text });
        if (success) {
            Alert.alert("Success", "Added to your vocabulary!");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View>
                    <Text className="text-2xl font-bold text-gray-900 tracking-tight">Sophie.ai</Text>
                    <Text className="text-gray-400 text-sm font-medium">Native speaker in your pocket</Text>
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

            {/* Main Content */}
            <View className="flex-1 px-6">
                {/* Status & Toggle Row */}
                <View className="flex-row justify-between items-center mb-4 px-2">
                    <View className="flex-row items-center gap-2">
                        <View 
                            key={`status-dot-${isConnected}-${isListening}`}
                            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-orange-500'} ${isListening ? 'animate-pulse' : ''}`} 
                        />
                        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                            {isListening ? "Live" : isSpeaking ? "Speaking" : isConnected ? "Connected" : status}
                        </Text>
                    </View>
                    <View className="flex-row items-center bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <Text className="text-gray-500 text-[10px] font-black uppercase tracking-tighter mr-2">Transcript</Text>
                        <Switch 
                            value={showTranscript} 
                            onValueChange={(val) => {
                                Logger.info(TAG, `Transcript Toggle: ${val}`);
                                setShowTranscript(val);
                            }}
                            trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
                            thumbColor="#fff"
                            ios_backgroundColor="#E2E8F0"
                            style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                        />
                    </View>
                </View>

                {/* The Main "Glass" Card */}
                <View className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden h-[320px] justify-center items-center">
                    <RainbowWave 
                        isListening={isListening} 
                        isSpeaking={isSpeaking} 
                        volumeLevel={volumeLevel} 
                    />
                    
                    {/* Overlay info */}
                    <View className="absolute bottom-8 items-center">
                        <Text className="text-gray-300 text-xs font-medium tracking-wide italic">
                            {isListening ? "Sophie is listening..." : isSpeaking ? "Sophie is responding..." : "Tap the mic to talk"}
                        </Text>
                    </View>
                </View>

                {/* Conversation View */}
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
                                    Conquer real conversation to speak like a native.
                                </Text>
                            </View>
                        ) : (
                            messages.map((msg) => (
                                <View key={msg.id} className="mb-8">
                                    {msg.role === 'model' ? (
                                        <View className="relative group">
                                            <View className="absolute -inset-0.5 rounded-3xl opacity-10 blur-sm bg-blue-500" />
                                            <View className="relative bg-white border border-gray-100 p-5 rounded-3xl shadow-sm">
                                                <View className="flex-row items-center gap-2 mb-2">
                                                    <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                                                        <Text className="text-[10px] font-black text-white">S</Text>
                                                    </View>
                                                    <View className="flex-row items-center gap-1.5">
                                                        <Wand2 size={12} color="#3B82F6" />
                                                        <Text className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Natural Correction</Text>
                                                    </View>
                                                </View>
                                                <Text className="text-gray-900 text-lg font-medium leading-relaxed">{msg.text}</Text>
                                                <View className="flex-row mt-3 gap-4 border-t border-gray-50 pt-3">
                                                    <TouchableOpacity className="flex-row items-center gap-1" onPress={() => handleTranslate(msg.text)}>
                                                        <Globe size={12} color="#94a3b8" />
                                                        <Text className="text-gray-400 text-xs font-bold">Translate</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity className="flex-row items-center gap-1" onPress={() => handleSaveVocabulary(msg.text)}>
                                                        <Bookmark size={12} color="#94a3b8" />
                                                        <Text className="text-gray-400 text-xs font-bold">Save</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    ) : (
                                        <View className="flex-row justify-end mb-2">
                                            <View className="bg-gray-100 px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] border border-gray-200/50">
                                                <Text className="text-gray-600 text-base font-medium">&quot;{msg.text}&quot;</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>

            {/* Footer - Replicated Premium Mic Button */}
            <View className="px-6 pb-12 pt-4 items-center">
                <View className="relative">
                    {/* Animated Outer Glow */}
                    {isListening && (
                        <View className="absolute -inset-4 rounded-full bg-red-500/20 opacity-50" />
                    )}
                    <Pressable 
                        onPressIn={() => {
                            Logger.info(TAG, 'Mic Button Press In');
                            if (!isListening) toggleRecording();
                        }}
                        onPressOut={() => {
                            Logger.info(TAG, 'Mic Button Press Out');
                            if (isListening) toggleRecording();
                        }}
                        className={`w-20 h-20 rounded-full items-center justify-center shadow-2xl ${isListening ? 'bg-red-500' : 'bg-red-600'}`}
                        style={{
                            shadowColor: '#ef4444',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: 0.4,
                            shadowRadius: 20,
                            elevation: 10,
                        }}
                    >
                        <Mic size={32} color="white" fill={isListening ? "white" : "none"} />
                    </Pressable>
                </View>
                <Text className="mt-4 text-gray-400 font-bold text-[10px] uppercase tracking-[3px]">
                    {isListening ? "Sophie is Listening" : isConnected ? "Hold to Speak" : "Connecting..."}
                </Text>
            </View>
        </SafeAreaView>
    );
}

