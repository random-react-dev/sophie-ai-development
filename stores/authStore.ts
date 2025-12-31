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
    signIn: (email: string) => Promise<void>;
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
    signIn: async (email) => {
        set({ isLoading: true });
        const { error } = await supabase.auth.signInWithOtp({ email });
        set({ isLoading: false });
        if (error) throw error;
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
