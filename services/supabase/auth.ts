import { supabase } from './client';

export const signInWithEmail = async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
        email,
    });
    return { data, error };
};

export const signUpWithPassword = async (email: string, password: string, options?: any) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
    });
    return { data, error };
}

export const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

export const resetPasswordForEmail = async (email: string, redirectTo: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    });
    return { data, error };
}

export const updateUserProfile = async (updates: any) => {
    const { data, error } = await supabase.auth.updateUser({
        data: updates
    });
    return { data, error };
}

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
