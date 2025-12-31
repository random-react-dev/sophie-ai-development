import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-get-random-values';

// As Expo's SecureStore does not support values larger than 2048 bytes,
// we need to use a hybrid method of storing the session.
// We will store the session in AsyncStorage, but encrypt it using a key stored in SecureStore.
class LargeSecureStore {
    private async _encrypt(key: string, value: string) {
        const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

        const cipher = new aesjs.ModeOfOperation.ctr(
            encryptionKey,
            new aesjs.Counter(1)
        );
        const textBytes = aesjs.utils.utf8.toBytes(value);
        const encryptedBytes = cipher.encrypt(textBytes);
        const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
        const encryptionKeyHex = aesjs.utils.hex.fromBytes(encryptionKey);

        await SecureStore.setItemAsync(key, encryptionKeyHex);

        return encryptedHex;
    }

    private async _decrypt(key: string, value: string) {
        const encryptionKeyHex = await SecureStore.getItemAsync(key);
        if (!encryptionKeyHex) {
            return encryptionKeyHex;
        }

        const cipher = new aesjs.ModeOfOperation.ctr(
            aesjs.utils.hex.toBytes(encryptionKeyHex),
            new aesjs.Counter(1)
        );
        const encryptedBytes = aesjs.utils.hex.toBytes(value);
        const decryptedBytes = cipher.decrypt(encryptedBytes);
        const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);

        return decryptedText;
    }

    async getItem(key: string) {
        const encrypted = await AsyncStorage.getItem(key);
        if (!encrypted) {
            return encrypted;
        }

        return await this._decrypt(key, encrypted);
    }

    async removeItem(key: string) {
        await AsyncStorage.removeItem(key);
        await SecureStore.deleteItemAsync(key);
    }

    async setItem(key: string, value: string) {
        const encrypted = await this._encrypt(key, value);

        await AsyncStorage.setItem(key, encrypted);
    }
}

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
            storage: Platform.OS === 'web' ? undefined : new LargeSecureStore(),
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);
