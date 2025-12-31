import { supabase } from '../supabase/client';

export interface VocabularyItem {
    id?: string;
    user_id: string;
    phrase: string;
    translation?: string;
    context?: string;
    created_at?: string;
    language?: string;
}

export const saveToVocabulary = async (item: Omit<VocabularyItem, 'user_id'>) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('vocabulary')
            .insert({
                ...item,
                user_id: user.id
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error saving to vocabulary:', error);
        return false;
    }
};

export const deleteFromVocabulary = async (id: string) => {
    try {
        const { error } = await supabase
            .from('vocabulary')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting from vocabulary:', error);
        return false;
    }
};

export const getVocabulary = async () => {
    try {
        const { data, error } = await supabase
            .from('vocabulary')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching vocabulary:', error);
        return [];
    }
};
