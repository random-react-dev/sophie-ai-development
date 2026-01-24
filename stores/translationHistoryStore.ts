import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  romanization: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface TranslationHistoryState {
  history: TranslationHistoryItem[];
  addEntry: (entry: Omit<TranslationHistoryItem, "id" | "timestamp">) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

const initialState = {
  history: [] as TranslationHistoryItem[],
};

export const useTranslationHistoryStore = create<TranslationHistoryState>()(
  persist(
    (set) => ({
      ...initialState,
      addEntry: (entry) =>
        set((state) => {
          // New entry at the top
          const newEntry: TranslationHistoryItem = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: Date.now(),
            ...entry,
          };
          
          // Add to history and limit to 50 items
          const newHistory = [newEntry, ...state.history].slice(0, 50);
          
          return { history: newHistory };
        }),
      removeEntry: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),
      clearHistory: () => set({ history: [] }),
      reset: () => set(initialState),
    }),
    {
      name: "translation-history",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
