import { CATEGORIES, Scenario, CEFRLevel, CEFR_LEVELS } from '@/constants/scenarios';
import { useAuthStore } from '@/stores/authStore';
import { useScenarioStore } from '@/stores/scenarioStore';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { 
    Search, Plus, Coffee, Briefcase, Compass, Bed, Mic, 
    ChevronRight, Sparkles, X
} from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import { 
    FlatList, ScrollView, Text, TextInput, TouchableOpacity, 
    View, Platform, KeyboardAvoidingView, Modal
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
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View>
                    <Text className="text-gray-400 text-sm font-medium">Sophie AI</Text>
                    <Text className="text-gray-400 text-xs font-medium">Native speaker in your pocket</Text>
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

            <View className="px-6 mb-6">
                <Text className="text-4xl font-bold text-gray-900 tracking-tight">Choose a Scenario</Text>
                <Text className="text-gray-400 text-base font-medium mt-1">Practice real-life conversations</Text>
            </View>

            {/* Search and Create Row */}
            <View className="px-6 flex-row gap-3 mb-6">
                <View className="flex-1 h-12 bg-gray-50 rounded-2xl flex-row items-center px-4 border border-gray-100">
                    <Search size={18} color="#94a3b8" />
                    <TextInput 
                        placeholder="Search scenarios..."
                        className="flex-1 ml-3 text-gray-900 font-medium"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
                <TouchableOpacity 
                    onPress={() => setCreateModalVisible(true)}
                    className="h-12 px-5 bg-blue-500 rounded-2xl flex-row items-center gap-2 shadow-lg shadow-blue-200"
                >
                    <Plus size={18} color="white" />
                    <Text className="text-white font-bold">Create</Text>
                </TouchableOpacity>
            </View>

            {/* Categories */}
            <View className="mb-6">
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
                >
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setSelectedCategory(cat)}
                            className={`px-5 py-2.5 rounded-full border ${selectedCategory === cat ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-100'}`}
                        >
                            <Text className={`font-bold text-xs uppercase tracking-widest ${selectedCategory === cat ? 'text-white' : 'text-gray-400'}`}>
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
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                renderItem={({ item }) => {
                    const Icon = IconMap[item.icon] || Sparkles;
                    const isOrderingCoffee = item.id === 'ordering-coffee';
                    
                    return (
                        <TouchableOpacity 
                            onPress={() => handleStartScenario(item)}
                            activeOpacity={0.7}
                            className={`mb-4 p-5 rounded-[32px] flex-row items-center border ${isOrderingCoffee ? 'bg-amber-50 border-amber-100/50' : 'bg-white border-gray-100 shadow-sm shadow-gray-100'}`}
                        >
                            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${isOrderingCoffee ? 'bg-amber-100' : 'bg-gray-50'}`}>
                                <Icon size={24} color={isOrderingCoffee ? '#b45309' : '#64748b'} />
                            </View>
                            <View className="flex-1 ml-4">
                                <Text className="text-lg font-bold text-gray-900">{item.title}</Text>
                                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-tighter mb-1">
                                    {item.category} • {item.level}
                                </Text>
                                <Text className="text-gray-500 text-xs leading-4" numberOfLines={2}>{item.description}</Text>
                            </View>
                            <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center mt-10">
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
                    <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-50">
                        <Text className="text-xl font-bold text-gray-900">Create Scenario</Text>
                        <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                        <View className="mb-6">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Sophie&apos;s Role *</Text>
                            <TextInput 
                                placeholder="e.g. A grumpy but helpful shopkeeper"
                                className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                                value={sophieRole}
                                onChangeText={setSophieRole}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Your Role</Text>
                            <TextInput 
                                placeholder="e.g. A customer in a hurry"
                                className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                                value={userRole}
                                onChangeText={setUserRole}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Topic *</Text>
                            <TextInput 
                                placeholder="e.g. Buying a vintage watch"
                                className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium"
                                value={topic}
                                onChangeText={setTopic}
                            />
                        </View>

                        <View className="mb-6">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Level</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {CEFR_LEVELS.map((l) => (
                                    <TouchableOpacity 
                                        key={l}
                                        onPress={() => setLevel(l)}
                                        className={`px-4 py-2 rounded-xl border ${level === l ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-100'}`}
                                    >
                                        <Text className={`font-bold text-xs ${level === l ? 'text-white' : 'text-gray-400'}`}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View className="mb-10">
                            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 ml-1">Context / Situation</Text>
                            <TextInput 
                                placeholder="Describe the setting..."
                                className="bg-gray-50 rounded-2xl px-4 py-4 text-gray-900 border border-gray-100 font-medium h-32 text-start align-top"
                                multiline
                                value={context}
                                onChangeText={setContext}
                            />
                        </View>
                    </ScrollView>

                    <View className="px-6 py-8 border-t border-gray-50">
                        <TouchableOpacity 
                            onPress={handleCreate}
                            className="w-full h-16 bg-gray-900 rounded-3xl items-center justify-center shadow-xl shadow-gray-200"
                        >
                            <Text className="text-white font-bold text-lg">Start Scenario</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
