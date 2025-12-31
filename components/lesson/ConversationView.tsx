import { Button } from '@/components/common/Button';
import { audioPlayer } from '@/services/audio/player';
import { audioRecorder } from '@/services/audio/recorder';
import { geminiWebSocket } from '@/services/gemini/websocket';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { AudioVisualizer } from './AudioVisualizer';

export function ConversationView() {
    const { connectionState, isListening, isSpeaking, volumeLevel, setListening, setVolumeLevel, reset } = useConversationStore();
    const { session } = useAuthStore();
    const [status, setStatus] = useState("Initializing...");

    // Derive isConnected for backward compatibility
    const isConnected = connectionState === 'connected';

    // Initialize Session and WebSocket
    useEffect(() => {
        const initSession = async () => {
            if (!session) return;

            try {
                setStatus("Getting secure token...");
                const { data, error } = await supabase.functions.invoke('get-gemini-session');
                if (error || !data?.token) throw new Error(error?.message || "No token returned");

                setStatus("Connecting to Gemini...");

                // System instruction for the lesson
                const instruction = "You are a helpful Spanish tutor. Use simple vocabulary. Correct my mistakes gently.";

                geminiWebSocket.connect(data.token, instruction);
                setStatus("Connected");

            } catch (err) {
                setStatus("Connection Failed");
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                Alert.alert("Error", errorMessage);
            }
        };

        initSession();

        return () => {
            geminiWebSocket.disconnect();
            audioRecorder.stop();
            audioPlayer.clearQueue();
            reset();
        };
    }, [session, reset]);

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
            } catch (err) {
                console.error("Recording error:", err);
                Alert.alert("Microphone Error", "Could not start recording.");
            }
        }
    };

    const handleEndLesson = () => {
        geminiWebSocket.disconnect();
        audioRecorder.stop();
        audioPlayer.clearQueue();
        reset();
    };

    return (
        <View className="flex-1 items-center justify-between py-12 bg-white">
            <View className="items-center space-y-4">
                <Text className="text-2xl font-bold text-gray-800">Spanish Lesson 1</Text>
                <Text className="text-gray-500 font-medium">{status}</Text>
            </View>

            <AudioVisualizer isListening={isListening} isSpeaking={isSpeaking} volumeLevel={volumeLevel} />

            <View className="w-full px-8 space-y-4">
                <Button
                    title={isListening ? "Stop Talking" : "Start Talking"}
                    variant={isListening ? "danger" : "primary"}
                    onPress={toggleRecording}
                    disabled={!isConnected}
                />
                <Button
                    title="End Lesson"
                    variant="secondary"
                    onPress={handleEndLesson}
                />
            </View>
        </View>
    );
}

