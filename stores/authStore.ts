import { supabase } from '@/services/supabase/client';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { create } from 'zustand';

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    initialized: boolean;
    showTrialPopup: boolean;
    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    setShowTrialPopup: (show: boolean) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    verifyOtp: (email: string, token: string) => Promise<void>;
    updateProfile: (data: { full_name: string; country?: string; app_language?: string; learn_language?: string }) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: false,
    initialized: false,
    showTrialPopup: false,
    setSession: (session: Session | null) => set({ session }),
    setUser: (user: User | null) => set({ user }),
    setShowTrialPopup: (show: boolean) => set({ showTrialPopup: show }),
    signIn: async (email, password) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            set({ showTrialPopup: true });
        } finally {
            set({ isLoading: false });
        }
    },
    signUp: async (email, password) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
        } finally {
            set({ isLoading: false });
        }
    },
    verifyOtp: async (email, token) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup',
            });
            if (error) throw error;
        } finally {
            set({ isLoading: false });
        }
    },
    updateProfile: async (data) => {
        set({ isLoading: true });
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: data.full_name,
                    country: data.country,
                    app_language: data.app_language,
                    learn_language: data.learn_language,
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
            const redirectTo = Linking.createURL('/forgot-password');
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });
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
        set({ 
            session, 
            user: session?.user ?? null, 
            initialized: true, 
            isLoading: false,
            showTrialPopup: !!session?.user 
        });

        supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            const newUser = session?.user ?? null;
            set((state) => ({ 
                session, 
                user: newUser,
                showTrialPopup: _event === 'SIGNED_IN' ? true : state.showTrialPopup
            }));
        });
    }
}));
