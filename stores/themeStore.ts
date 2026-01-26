import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { create } from "zustand";

const THEME_STORAGE_KEY = "APP_THEME";

type ThemeType = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",

  setTheme: async (newTheme: ThemeType) => {
    try {
      colorScheme.set(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      set({ theme: newTheme });
    } catch (error) {
      console.warn("Failed to save theme:", error);
    }
  },

  loadTheme: async () => {
    try {
      const savedTheme = (await AsyncStorage.getItem(
        THEME_STORAGE_KEY
      )) as ThemeType;
      
      if (savedTheme === "light" || savedTheme === "dark") {
        colorScheme.set(savedTheme);
        set({ theme: savedTheme });
      } else {
        colorScheme.set("system");
        set({ theme: "system" });
      }
    } catch (error) {
      console.warn("Failed to load theme:", error);
      colorScheme.set("system");
      set({ theme: "system" });
    }
  },
}));

// ============================================
// Atomic Selectors
// ============================================

export const useTheme = (): ThemeType => useThemeStore((s) => s.theme);
