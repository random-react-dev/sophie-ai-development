import { supabase } from './client';

export interface UserStats {
    id: string;
    user_id: string;
    total_speaking_seconds: number;
    total_conversations: number;
    created_at: string;
    updated_at: string;
}

export const getUserStats = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            // If no rows found, that's okay (new user), return default
            if (error.code === 'PGRST116') {
                return {
                    total_speaking_seconds: 0,
                    total_conversations: 0
                } as UserStats;
            }
            throw error;
        }

        return data as UserStats;
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return null;
    }
};

export const incrementStats = async (speakingSeconds: number, conversations: number) => {
    try {
        const { error } = await supabase.rpc('increment_user_stats', {
            speaking_seconds_inc: speakingSeconds,
            conversations_inc: conversations
        });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error incrementing stats:', error);
        return false;
    }
};
