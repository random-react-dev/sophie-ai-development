import i18n from "@/services/i18n";
import { useCurrentLanguage } from "@/stores/languageStore";
import { useCallback } from "react";

export function useTranslation() {
  // Subscribe to language changes to trigger re-renders
  const currentLanguage = useCurrentLanguage();

  // Ensure i18n locale is synced with store
  if (i18n.locale !== currentLanguage) {
    i18n.locale = currentLanguage;
  }

  const t = useCallback(
    (key: string, options?: object) => {
      return i18n.t(key, options);
    },
    [currentLanguage], // Re-create t function when language changes
  );

  return { t, locale: currentLanguage };
}
