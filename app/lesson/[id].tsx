import { ConversationView } from '@/components/lesson/ConversationView';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function LessonScreen() {
    const { id } = useLocalSearchParams();

    return (
        <>
            <Stack.Screen options={{ title: `Lesson ${id}`, headerShown: true }} />
            <ConversationView />
        </>
    );
}
