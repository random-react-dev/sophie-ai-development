import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';

const i18n = new I18n({
    en,
    hi,
    es,
    fr,
    de,
});

// Set the locale once at the beginning of your app.
i18n.locale = getLocales()[0].languageCode ?? 'en';

// When a value is missing from a language it'll fall back to another language with the key present.
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const STORAGE_KEY = 'app-language'; // Matches Zustand persist key if we want to share, but here we just read specifically

export const loadLanguage = async () => {
    try {
        // We need to read the ZUSTAND persist state, because that's where the source of truth is now.
        // Zustand persist stores data as a JSON string: { state: { currentLanguage: "..." }, version: 0 }
        const savedState = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            const lang = parsed.state?.currentLanguage;
            if (lang) {
                i18n.locale = lang;
                return lang;
            }
        }
    } catch (error) {
        console.warn('Failed to load language', error);
    }
    return i18n.locale;
};


export default i18n;
