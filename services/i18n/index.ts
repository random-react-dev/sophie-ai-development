import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// basic translations for testing
const en = {
    welcome: 'Welcome',
    profile: 'Profile',
    learning: 'Learning',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
};

const hi = {
    welcome: 'नमस्ते',
    profile: 'प्रोफ़ाइल',
    learning: 'सीख रहे हैं',
    loading: 'लोड हो रहा है...',
    save: 'सहेजें',
    cancel: 'रद्द करें',
};

const es = {
    welcome: 'Bienvenido',
    profile: 'Perfil',
    learning: 'Aprendiendo',
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
};

const i18n = new I18n({
    en,
    hi,
    es,
});

// Set the locale once at the beginning of your app.
i18n.locale = getLocales()[0].languageCode ?? 'en';

// When a value is missing from a language it'll fall back to another language with the key present.
i18n.enableFallback = true;

const STORAGE_KEY = 'app_language';

export const loadLanguage = async () => {
    try {
        const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLanguage) {
            i18n.locale = savedLanguage;
        }
    } catch (error) {
        console.warn('Failed to load language', error);
    }
    return i18n.locale;
};

export const setAppLanguage = async (lang: string) => {
    i18n.locale = lang;
    try {
        await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
        console.warn('Failed to save language', error);
    }
};

export default i18n;
