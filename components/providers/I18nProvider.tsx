import { loadLanguage } from "@/services/i18n";
import { useLanguageStore } from "@/stores/languageStore";
import { useEffect, useState } from "react";
import { View } from "react-native";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  useEffect(() => {
    const initLanguage = async () => {
      // Load persisted language from AsyncStorage into i18n-js
      const savedLang = await loadLanguage();
      // Sync with Zustand store
      setLanguage(savedLang);
      setIsLoaded(true);
    };

    initLanguage();
  }, [setLanguage]);

  if (!isLoaded) {
    return <View />; // Or a splash screen / loader
  }

  return <>{children}</>;
}
