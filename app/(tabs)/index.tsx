import { CATEGORIES, CEFRLevel, CEFR_LEVELS, Scenario } from '@/constants/scenarios';
import { useAuthStore } from '@/stores/authStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import {
    Bed,
    Briefcase,
    ChevronRight,
    Coffee,
    Compass,
    Mic,
    Plus,
    Sparkles, Star
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView, Modal,
    Platform,
    ScrollView, Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const IconMap: Record<string, any> = {
    coffee: Coffee,
    briefcase: Briefcase,
    compass: Compass,
    bed: Bed,
    mic: Mic,
};

export default function RoleplayScreen() {
    const {
        scenarios, searchQuery, setSearchQuery,
        selectedCategory, setSelectedCategory, selectScenario
    } = useScenarioStore();
    const { user } = useAuthStore();
    const router = useRouter();
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);

    const filteredScenarios = useMemo(() => {
        return scenarios.filter(s => {
            const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [scenarios, searchQuery, selectedCategory]);

    const handleStartScenario = (scenario: Scenario) => {
        selectScenario(scenario);
        router.push('/(tabs)/talk' as any);
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
                <Text className="text-4xl font-bold text-black text-left">Choose a Scenario</Text>
                <Text className="text-gray-500 text-lg font-medium mt-1 text-left">Practice real-life conversations</Text>
            </View>

            {/* Search and Create Row */}
            <View className="px-6 flex-row gap-2 mb-6">
                <View className="flex-1 h-12 bg-white shadow-lg rounded-full flex-row items-center px-4">
                    <Feather name="search" size={20} color="gray" />
                    <TextInput
                        placeholder="Search scenarios..."
                        className="flex-1 ml-3 text-gray-900 font-medium text-base"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="gray"
                    />
                </View>
                <TouchableOpacity
                    onPress={() => setCreateModalVisible(true)}
                    className="h-12 px-4 bg-blue-500 rounded-full flex-row items-center gap-2"
                >
                    <Plus size={20} color="white" />
                    <Text className="text-white font-bold text-base">Create</Text>
                </TouchableOpacity>
            </View>

            {/* Categories */}
            <View className="mb-6">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                >
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-full border ${selectedCategory === cat ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300'}`}
                        >
                            <Text className={`font-bold text-[13px] ${selectedCategory === cat ? 'text-blue-500' : 'text-gray-600'}`}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Scenarios List */}
            <FlatList
                data={filteredScenarios}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                renderItem={({ item }) => {
                    const Icon = IconMap[item.icon] || Sparkles;
                    const bgColor = 'bg-white';

                    return (
                        <TouchableOpacity
                            onPress={() => handleStartScenario(item)}
                            activeOpacity={0.7}
                            className={`mb-4 p-4 rounded-2xl shadow-lg flex-row items-center ${bgColor}`}
                        >
                            <View className="w-12 h-12 rounded-xl items-center justify-center transform scale-110">
                                <Icon size={28} color="gray" />
                            </View>
                            <View className="flex-1 ml-6">
                                <Text className="text-xl font-bold text-black">{item.title}</Text>
                                <Text className="text-gray-400 text-base font-medium">
                                    {item.category}
                                </Text>
                                <Text className="text-gray-400 text-sm font-medium" numberOfLines={2}>{item.description}</Text>
                            </View>
                            <ChevronRight size={24} color="gray" />
                        </TouchableOpacity>
                    );
                }}
                ListFooterComponent={() => (
                    <TouchableOpacity
                        onPress={() => setCreateModalVisible(true)}
                        activeOpacity={0.7}
                        className="mb-4 p-5 rounded-2xl flex-row items-center border-2 border-dashed border-gray-300 shadow-lg"
                    >
                        <View className="w-12 h-12 rounded-xl items-center justify-center">
                            <Star size={24} color="gray" />
                        </View>
                        <View className="flex-1 ml-6">
                            <Text className="text-xl font-bold text-black">Create Your Own</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View className="items-center my-10">
                        <Text className="text-gray-400 font-medium italic">No scenarios found</Text>
                    </View>
                }
            />

            <CreateScenarioModal
                visible={isCreateModalVisible}
                onClose={() => setCreateModalVisible(false)}
            />
        </SafeAreaView>
    );
}

function CreateScenarioModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    const { addCustomScenario, selectScenario } = useScenarioStore();
    const router = useRouter();
    const [sophieRole, setSophieRole] = useState('');
    const [userRole, setUserRole] = useState('');
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState<CEFRLevel>('B1');
    const [context, setContext] = useState('');

    const handleCreate = () => {
        if (!sophieRole || !topic) {
            alert('Sophie\'s Role and Topic are required!');
            return;
        }

        const newScenario: Scenario = {
            id: Math.random().toString(36).substring(7),
            title: topic,
            category: 'Custom',
            description: context || `Roleplay about ${topic}`,
            sophieRole,
            userRole: userRole || 'Learner',
            topic,
            level,
            context: context || `A conversation about ${topic}`,
            icon: 'mic'
        };

        addCustomScenario(newScenario);
        onClose();
        selectScenario(newScenario);
        router.push('/(tabs)/talk' as any);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-white"
            >
                <SafeAreaView className="flex-1">
                    <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
                        <Text className="text-3xl font-bold text-black">Create Scenario</Text>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full bg-gray-100">
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                        <View className="mb-6">
                            <Text className="text-gray-500 text-base shadow-lg font-semibold capitalize mb-2 ml-1">Sophie&apos;s Role <Text className="text-red-500">*</Text></Text>
                            <TextInput
                                placeholder="e.g. A grumpy but helpful shopkeeper"
                                placeholderTextColor="gray"
                                className="bg-gray-50 rounded-full px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                                value={sophieRole}
                                onChangeText={setSophieRole}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">Your Role</Text>
                            <TextInput
                                placeholder="e.g. A customer in a hurry"
                                placeholderTextColor="gray"
                                className="bg-gray-50 rounded-full px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                                value={userRole}
                                onChangeText={setUserRole}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">Topic <Text className="text-red-500">*</Text></Text>
                            <TextInput
                                placeholder="e.g. Buying a vintage watch"
                                placeholderTextColor="gray"
                                className="bg-gray-50 rounded-full px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                                value={topic}
                                onChangeText={setTopic}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">Level</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {CEFR_LEVELS.map((l) => (
                                    <TouchableOpacity
                                        key={l}
                                        onPress={() => setLevel(l)}
                                        className={`px-4 py-2 rounded-full border ${level === l ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300'}`}
                                    >
                                        <Text className={`font-bold text-xs ${level === l ? 'text-blue-500' : 'text-gray-600'}`}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View className="mb-10">
                            <Text className="text-gray-500 text-base font-semibold capitalize mb-2 ml-1">Context / Situation</Text>
                            <TextInput
                                placeholder="Describe the setting..."
                                placeholderTextColor="gray"
                                className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium h-32 text-start align-top"
                                multiline
                                value={context}
                                onChangeText={setContext}
                            />
                        </View>
                    </ScrollView>

                    <View className="px-6 py-8 border-t border-gray-100">
                        <TouchableOpacity
                            onPress={handleCreate}
                            className="w-full h-16 bg-blue-500 rounded-full items-center justify-center shadow-lg"
                        >
                            <Text className="text-white font-bold text-lg">Start Scenario</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
