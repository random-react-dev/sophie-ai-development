import { Language } from '@/constants/languages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LearningState {
    targetLanguage: Language | null;
    nativeLanguage: Language | null;
    setTargetLanguage: (lang: Language | null) => void;
    setNativeLanguage: (lang: Language | null) => void;
}

export const useLearningStore = create<LearningState>()(
    persist(
        (set) => ({
            targetLanguage: null,
            nativeLanguage: null,
            setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
            setNativeLanguage: (nativeLanguage) => set({ nativeLanguage }),
        }),
        {
            name: 'sophie-learning-preferences',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const targetLanguage = useTargetLanguage();
// ============================================

export const useTargetLanguage = (): Language | null =>
    useLearningStore((s) => s.targetLanguage);
export const useNativeLanguage = (): Language | null =>
    useLearningStore((s) => s.nativeLanguage);
