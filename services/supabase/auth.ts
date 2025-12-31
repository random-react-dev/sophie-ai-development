import { supabase } from './client';

export const signInWithEmail = async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
        email,
    });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
