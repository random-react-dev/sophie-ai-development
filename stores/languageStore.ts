import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LanguageState {
  currentLanguage: string;
  isHydrated: boolean;
  setLanguage: (lang: string) => void;
  setHydrated: (state: boolean) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: "en",
      isHydrated: false,
      setLanguage: (lang) => set({ currentLanguage: lang }),
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: "app-language",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

// Atomic Selectors
export const useCurrentLanguage = () =>
  useLanguageStore((state) => state.currentLanguage);
export const useIsLanguageHydrated = () =>
  useLanguageStore((state) => state.isHydrated);
