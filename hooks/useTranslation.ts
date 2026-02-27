import i18n from "@/services/i18n";
import { useCurrentLanguage } from "@/stores/languageStore";

export function useTranslation() {
  // Subscribe to language changes to trigger re-renders
  const currentLanguage = useCurrentLanguage();

  // Ensure i18n locale is synced with store
  if (i18n.locale !== currentLanguage) {
    i18n.locale = currentLanguage;
  }

  const t = (key: string, options?: object) => i18n.t(key, options);

  return { t, locale: currentLanguage };
}
