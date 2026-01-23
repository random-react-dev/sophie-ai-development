import { supabase } from '../supabase/client';

export interface VocabularyFolder {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface VocabularyItem {
    id?: string;
    user_id: string;
    phrase: string;
    translation?: string;
    context?: string;
    created_at?: string;
    language?: string;
    folder_id?: string | null;
    folder?: VocabularyFolder; // Joined data
}

export const getFolders = async () => {
    try {
        const { data, error } = await supabase
            .from('vocabulary_folders')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as VocabularyFolder[];
    } catch (error) {
        console.error('Error fetching folders:', error);
        return [];
    }
};

export const createFolder = async (name: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('vocabulary_folders')
            .insert({
                name,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data as VocabularyFolder;
    } catch (error) {
        console.error('Error creating folder:', error);
        return null;
    }
};

export const saveToVocabulary = async (item: Omit<VocabularyItem, 'user_id'>) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Remove 'folder' object if present, only save folder_id
        const { folder, ...itemData } = item;

        const { data, error } = await supabase
            .from('vocabulary')
            .insert({
                ...itemData,
                user_id: user.id
            })
            .select(`
                *,
                folder:vocabulary_folders(*)
            `)
            .single();

        if (error) throw error;
        return data as VocabularyItem;
    } catch (error) {
        console.error('Error saving to vocabulary:', error);
        return null;
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
        // Fetch items and join with folders
        const { data, error } = await supabase
            .from('vocabulary')
            .select(`
                *,
                folder:vocabulary_folders(*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as VocabularyItem[];
    } catch (error) {
        console.error('Error fetching vocabulary:', error);
        return [];
    }
};
