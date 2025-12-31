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
    const { isConnected, isListening, isSpeaking, volumeLevel, disconnect, setListening, setVolumeLevel, setIsConnected } = useConversationStore();
    const { session } = useAuthStore();
    const [status, setStatus] = useState("Initializing...");

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
                setIsConnected(true);
                setStatus("Connected");

            } catch (err: any) {
                setStatus("Connection Failed");
                Alert.alert("Error", err.message || "Unknown error");
            }
        };

        initSession();

        return () => {
            disconnect();
            geminiWebSocket.disconnect();
            audioRecorder.stop();
            audioPlayer.clearQueue();
        };
    }, [session, disconnect, setIsConnected]);

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
                        // VAD Logic: If volume > threshold, interrupt playback
                        // This is rudimentary; usually triggered by volume level data
                    },
                    onVolumeChange: (rms) => {
                        setVolumeLevel(rms);
                        // Simple VAD Threshold (Placeholder values, tune in production)
                        if (rms > 0.05 && isSpeaking) {
                            // User interrupted!
                            // audioPlayer.clearQueue(); // This might trigger too easily, need debounce
                        }
                    }
                });
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setListening(true);
            } catch (err: any) {
                console.error("Recording error:", err);
                Alert.alert("Microphone Error", "Could not start recording.");
            }
        }
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
                    onPress={disconnect}
                />
            </View>
        </View>
    );
}
