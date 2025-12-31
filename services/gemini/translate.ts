import { supabase } from '../supabase/client';

export const translateText = async (text: string, targetLanguage: string = 'en'): Promise<string> => {
    try {
        const { data, error } = await supabase.functions.invoke('translate-text', {
            body: { text, targetLanguage }
        });

        if (error) throw error;
        return data.translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text
    }
};
