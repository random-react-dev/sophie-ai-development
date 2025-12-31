import { Tabs, useRouter, usePathname } from 'expo-router';
import { Mic, Globe, BookOpen, Languages, VenetianMask } from 'lucide-react-native';
import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { useConversationStore } from '@/stores/conversationStore';

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { startGlobalRecording, stopGlobalRecording } = useConversationStore();

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
          tabBarIcon: ({ color }) => <Globe size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
