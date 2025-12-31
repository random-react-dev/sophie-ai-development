import { supabase } from './client';

export const signInWithEmail = async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
        email,
    });
    return { data, error };
};

export const signUpWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
}

export const verifyOTP = async (email: string, token: string, type: 'signup' | 'recovery' | 'email_change' | 'email') => {
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
    });
    return { data, error };
};

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

export interface UserProfileUpdate {
    full_name?: string;
    country?: string;
    app_language?: string;
    learn_language?: string;
    avatar_url?: string;
    data?: any; // Allow flexibility but try to rely on typed fields
}

export const updateUserProfile = async (updates: UserProfileUpdate) => {
    const { data, error } = await supabase.auth.updateUser({
        data: updates
    });
    return { data, error };
}

export const changePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
        password
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
