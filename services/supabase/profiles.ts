import { supabase } from '../supabase/client';

export interface LearningProfile {
    id: string;
    user_id: string;
    name: string;
    native_language: string;
    target_language: string;
    medium_language?: string;
    preferred_accent?: string;
    is_active: boolean;
    created_at: string;
}

export interface CreateProfileDTO {
    name: string;
    native_language: string;
    target_language: string;
    medium_language?: string;
    preferred_accent?: string;
}

export const getProfiles = async () => {
    try {
        const { data, error } = await supabase
            .from('learning_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as LearningProfile[];
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
};

export const createProfile = async (profile: CreateProfileDTO) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Deactivate other profiles if this is the first one, or handle logic in store
        // For now just insert
        const { data, error } = await supabase
            .from('learning_profiles')
            .insert({
                ...profile,
                user_id: user.id,
                is_active: true // Default new ones to active, we'll handle switching in store/logic
            })
            .select()
            .single();

        if (error) throw error;
        return data as LearningProfile;
    } catch (error) {
        console.error('Error creating profile:', error);
        return null;
    }
};

export const deleteProfile = async (id: string) => {
    try {
        const { error } = await supabase
            .from('learning_profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting profile:', error);
        return false;
    }
};

export const setProfileActive = async (id: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // 1. Set all user's profiles to inactive
        await supabase
            .from('learning_profiles')
            .update({ is_active: false })
            .eq('user_id', user.id);

        // 2. Set requested profile to active
        const { data, error } = await supabase
            .from('learning_profiles')
            .update({ is_active: true })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as LearningProfile;
    } catch (error) {
        console.error('Error activating profile:', error);
        return null;
    }
};
