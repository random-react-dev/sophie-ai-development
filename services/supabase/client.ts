import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        return SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        return SecureStore.deleteItemAsync(key);
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Authentication will fail.');
}

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter, // Use local storage on web, secure store on native
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);
