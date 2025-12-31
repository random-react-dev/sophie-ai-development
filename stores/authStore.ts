import { supabase } from '@/services/supabase/client';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, data: { full_name: string; country?: string; app_language?: string; learn_language?: string }) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: false,
    initialized: false,
    setSession: (session: Session | null) => set({ session }),
    setUser: (user: User | null) => set({ user }),
    signIn: async (email, password) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } finally {
            set({ isLoading: false });
        }
    },
    signUp: async (email, password, data) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: data.full_name,
                        country: data.country,
                        app_language: data.app_language,
                        learn_language: data.learn_language,
                    }
                }
            });
            if (error) throw error;
        } finally {
            set({ isLoading: false });
        }
    },
    forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
            // For mobile, we would typically use a deep link scheme like 'sophie://reset-password'
            // For now, we'll just redirect to a generic page or let Supabase handle it if configured
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
        } finally {
            set({ isLoading: false });
        }
    },
    signOut: async () => {
        set({ isLoading: true });
        await supabase.auth.signOut();
        set({ user: null, session: null, isLoading: false });
    },
    initialize: async () => {
        set({ isLoading: true });
        const { data: { session } } = await supabase.auth.getSession();
        set({ session, user: session?.user ?? null, initialized: true, isLoading: false });

        supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            set({ session, user: session?.user ?? null });
        });
    }
}));
