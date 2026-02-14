import { Language } from '@/constants/languages';
import { CEFRLevel } from '@/constants/scenarios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LearningState {
    targetLanguage: Language | null;
    nativeLanguage: Language | null;
    cefrLevel: CEFRLevel;
    setTargetLanguage: (lang: Language | null) => void;
    setNativeLanguage: (lang: Language | null) => void;
    setCefrLevel: (level: CEFRLevel) => void;
    reset: () => void;
}

const initialState = {
    targetLanguage: null as Language | null,
    nativeLanguage: null as Language | null,
    cefrLevel: 'S1' as CEFRLevel,
};

export const useLearningStore = create<LearningState>()(
    persist(
        (set) => ({
            ...initialState,
            setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
            setNativeLanguage: (nativeLanguage) => set({ nativeLanguage }),
            setCefrLevel: (cefrLevel) => set({ cefrLevel }),
            reset: () => set(initialState),
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
export const useCefrLevel = (): CEFRLevel =>
    useLearningStore((s) => s.cefrLevel);
