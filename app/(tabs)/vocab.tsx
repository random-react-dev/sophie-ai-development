import { getVocabulary, VocabularyItem } from '@/services/supabase/vocabulary';
import { useAuthStore } from '@/stores/authStore';
import { Image } from 'expo-image';
import { 
    BookOpen, Search, Play, MessageCircle
} from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { 
    FlatList, Text, TextInput, TouchableOpacity, 
    View, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function VocabScreen() {
    const { user } = useAuthStore();
    const [items, setItems] = useState<VocabularyItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchVocab = async () => {
        try {
            const data = await getVocabulary();
            setItems(data);
        } catch (error) {
            console.error('Error fetching vocab:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchVocab();
    }, []);

    const filteredItems = useMemo(() => {
        return items.filter(item => 
            item.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.translation && item.translation.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [items, searchQuery]);

    const handlePlay = (text: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // In a real app, trigger TTS here
        Alert.alert("Listen", `Playing audio for: "${text}"`);
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchVocab();
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View>
                    <Text className="text-gray-400 text-sm font-medium">Sophie AI</Text>
                    <Text className="text-gray-900 text-2xl font-bold tracking-tight">Vocabulary</Text>
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

            {/* Search Bar */}
            <View className="px-6 mb-6 mt-2">
                <View className="h-12 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-gray-100 shadow-sm shadow-gray-50">
                    <Search size={18} color="#94a3b8" />
                    <TextInput 
                        placeholder="Search your phrases..."
                        className="flex-1 ml-3 text-gray-900 font-medium"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </View>

            {isLoading && !isRefreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
                    }
                    renderItem={({ item }) => (
                        <View className="mb-4 bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm shadow-gray-100">
                            <View className="flex-row justify-between items-start mb-2">
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <MessageCircle size={12} color="#3b82f6" />
                                        <Text className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Saved Phrase</Text>
                                    </View>
                                    <Text className="text-lg font-bold text-gray-900 leading-tight">{item.phrase}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handlePlay(item.phrase)} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
                                    <Play size={16} color="#3b82f6" fill="#3b82f6" />
                                </TouchableOpacity>
                            </View>

                            {item.translation && (
                                <View className="mt-3 pt-3 border-t border-gray-50">
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mb-1">Translation</Text>
                                    <Text className="text-gray-600 font-medium italic">&quot;{item.translation}&quot;</Text>
                                </View>
                            )}

                            {item.context && (
                                <View className="flex-row items-center gap-1.5 mt-3">
                                    <View className="px-2 py-0.5 bg-gray-50 rounded-md">
                                        <Text className="text-gray-400 text-[8px] font-black uppercase">{item.context}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="items-center mt-20 opacity-30">
                            <BookOpen size={80} color="#94a3b8" strokeWidth={1} />
                            <Text className="text-gray-500 font-bold mt-4 text-center px-10">
                                {searchQuery ? "No matches found" : "Your saved phrases will appear here. Practice and grow!"}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
