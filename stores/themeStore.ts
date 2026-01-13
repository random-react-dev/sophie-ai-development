import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const THEME_STORAGE_KEY = "APP_THEME";

type ThemeType = "light" | "dark";

interface ThemeState {
  theme: ThemeType;
  isLoading: boolean;
  setTheme: (theme: ThemeType) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  isLoading: true,

  setTheme: async (theme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
      set({ theme });
    } catch (error) {
      console.warn("Failed to save theme:", error);
    }
  },

  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        set({ theme: savedTheme, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn("Failed to load theme:", error);
      set({ isLoading: false });
    }
  },
}));
