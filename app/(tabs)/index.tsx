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
import { Mic } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const { 
        isListening, isSpeaking, volumeLevel, 
        messages, showTranscript, 
        setListening, setVolumeLevel, setIsConnected, setShowTranscript 
    } = useConversationStore();
    const { session, user } = useAuthStore();
    const [status, setStatus] = useState("Initializing...");
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const initSession = async () => {
            if (!session) return;

            try {
                setStatus("Connecting...");
                
                let token = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
                
                if (!token) {
                    const { data, error } = await supabase.functions.invoke('get-gemini-session');
                    if (error || !data?.token) throw new Error(error?.message || "No token returned");
                    token = data.token;
                }

                const instruction = "You are Sophie, a friendly AI language tutor. Keep your responses concise and helpful. Use simple vocabulary.";
                geminiWebSocket.connect(token, instruction);
                setIsConnected(true);
                setStatus("Connected");
            } catch (err: any) {
                setStatus("Failed to connect");
                console.error("Gemini session error:", err);
                Alert.alert("Error", err.message || "Unknown error");
            }
        };

        initSession();

        return () => {
            geminiWebSocket.disconnect();
            audioRecorder.stop();
            audioPlayer.clearQueue();
        };
    }, [session, setIsConnected]);

    useEffect(() => {
        if (showTranscript) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages, showTranscript]);

    const toggleRecording = async () => {
        if (isListening) {
            await audioRecorder.stop();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setListening(false);
        } else {
            try {
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
                console.error("Recording error:", error);
                Alert.alert("Microphone Error", "Could not start recording.");
            }
        }
    };

    const handleTranslate = async (messageId: string, text: string) => {
        const translated = await translateText(text);
        Alert.alert("Translation", translated);
    };

    const handleSaveVocabulary = async (text: string) => {
        const success = await saveToVocabulary({ phrase: text });
        if (success) {
            Alert.alert("Success", "Added to your vocabulary!");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8F9FA]" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View>
                    <Text className="text-2xl font-bold text-gray-900">Sophie AI</Text>
                    <Text className="text-gray-500">Native speaker in your pocket</Text>
                </View>
                <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                        <Image source={{ uri: user.user_metadata.avatar_url }} className="w-full h-full" />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-blue-100">
                            <Text className="text-blue-500 font-bold">{user?.email?.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View className="flex-1 px-6 justify-center">
                <View className="bg-white rounded-[40px] p-6 shadow-sm mb-6 min-h-[200px] justify-center relative overflow-hidden">
                    <View className="flex-row justify-between items-center absolute top-6 left-6 right-6 z-10">
                        <Text className="text-gray-400 font-medium">
                            {isListening ? "Listening..." : isSpeaking ? "Speaking..." : status}
                        </Text>
                        <View className="flex-row items-center">
                            <Text className="text-gray-400 text-sm mr-2">Transcript</Text>
                            <Switch 
                                value={showTranscript} 
                                onValueChange={setShowTranscript}
                                trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
                            />
                        </View>
                    </View>

                    <RainbowWave 
                        isListening={isListening} 
                        isSpeaking={isSpeaking} 
                        volumeLevel={volumeLevel} 
                    />
                </View>

                {/* Transcript Mode */}
                {showTranscript && (
                    <ScrollView 
                        ref={scrollViewRef}
                        className="flex-1 mb-6"
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.length === 0 ? (
                            <Text className="text-gray-300 text-center mt-10">No messages yet. Start talking!</Text>
                        ) : (
                            messages.map((msg) => (
                                <TouchableOpacity 
                                    key={msg.id} 
                                    className="mb-6"
                                    onPress={() => {
                                        Alert.alert(
                                            "Message Options",
                                            "What would you like to do?",
                                            [
                                                { text: "Translate", onPress: () => handleTranslate(msg.id, msg.text) },
                                                { text: "Save to Vocabulary", onPress: () => handleSaveVocabulary(msg.text) },
                                                { text: "Cancel", style: "cancel" }
                                            ]
                                        );
                                    }}
                                >
                                    <View className="flex-row items-start mb-1">
                                        <Text className={`font-bold mr-2 ${msg.role === 'model' ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {msg.role === 'model' ? 'Sophie' : 'You'}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-700 text-lg leading-6">{msg.text}</Text>
                                    <View className="flex-row mt-2 space-x-4">
                                        <TouchableOpacity onPress={() => handleTranslate(msg.id, msg.text)}>
                                            <Text className="text-blue-500 text-xs">Translate • Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Footer - Push to Talk */}
            <View className="px-6 pb-10 pt-4 items-center">
                <TouchableOpacity 
                    onPress={toggleRecording}
                    activeOpacity={0.8}
                    className={`w-20 h-20 rounded-full items-center justify-center shadow-2xl ${isListening ? 'bg-red-500 shadow-red-500/50' : 'bg-red-600 shadow-red-600/50'}`}
                >
                    <Mic size={32} color="white" fill={isListening ? "white" : "none"} />
                </TouchableOpacity>
                <Text className="mt-4 text-gray-400 font-medium">
                    {isListening ? "Release to Send" : "Push to Talk"}
                </Text>
            </View>
        </SafeAreaView>
    );
}
