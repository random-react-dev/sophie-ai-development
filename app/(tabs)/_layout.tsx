import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useProfileStore } from '@/stores/profileStore';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { BookOpen, Globe, Languages, Mic, VenetianMask } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { startGlobalRecording, stopGlobalRecording } = useConversationStore();
  const { activeProfile, fetchProfiles } = useProfileStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  // Find flag for active profile target language
  const activeFlag = activeProfile
    ? SUPPORTED_LANGUAGES.find(l => l.name === activeProfile.target_language)?.flag
    : null;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#94a3b8',
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        height: Platform.OS === 'ios' ? 88 : 70,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        paddingTop: 12,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Roleplay',
          tabBarIcon: ({ color }) => <VenetianMask size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="translate"
        options={{
          title: 'Translate',
          tabBarIcon: ({ color }) => <Languages size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="talk"
        options={{
          title: '',
          tabBarButton: (props) => {
            const isFocused = pathname === '/talk';

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPressIn={() => {
                  if (isFocused) {
                    startGlobalRecording();
                  } else {
                    router.push('/(tabs)/talk' as any);
                  }
                }}
                onPressOut={() => {
                  if (isFocused) {
                    stopGlobalRecording();
                  }
                }}
                className="items-center justify-center -top-5"
              >
                <View className={`w-16 h-16 rounded-3xl items-center justify-center shadow-2xl ${isFocused ? 'bg-red-500 shadow-red-200' : 'bg-gray-900 shadow-gray-400'} border-4 border-white`}>
                  <Mic size={28} color="white" fill="white" />
                </View>
              </TouchableOpacity>
            );
          }
        }}
      />
      <Tabs.Screen
        name="vocab"
        options={{
          title: 'Vocab',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="language"
        options={{
          title: 'Language',
          tabBarIcon: ({ color }) => (
            <View>
              <Globe size={24} color={color} />
              {activeFlag && (
                <View className="absolute -top-1 -right-2 bg-white rounded-full w-4 h-4 items-center justify-center shadow-sm">
                  <Text style={{ fontSize: 8 }}>{activeFlag}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
