import {
  UserProfileUpdate,
  changePassword as authChangePassword,
  updateUserProfile,
} from "@/services/supabase/auth";
import { supabase } from "@/services/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { create } from "zustand";
import { useConversationStore } from "./conversationStore";
import { useGameStore } from "./gameStore";
import { useLearningStore } from "./learningStore";
import { useProfileStore } from "./profileStore";
import { useStatsStore } from "./statsStore";
import { useTranslationHistoryStore } from "./translationHistoryStore";
import { useVocabularyStore } from "./vocabularyStore";

/**
 * Clear all user-specific data from stores and AsyncStorage on logout.
 * This ensures complete data isolation between different user accounts.
 */
const clearUserData = async (): Promise<void> => {
  // Clear persisted stores from AsyncStorage
  await AsyncStorage.multiRemove([
    "translation-history",
    "profile-storage",
    "sophie-learning-preferences",
  ]);

  // Reset in-memory and persisted stores to initial state
  useTranslationHistoryStore.getState().reset();
  useProfileStore.getState().reset();
  useLearningStore.getState().reset();
  useVocabularyStore.setState({ items: [], folders: [], isLoading: false });
  useStatsStore.getState().reset();
  useConversationStore.getState().reset();
  useGameStore.getState().reset();
};

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
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
        type: "signup",
      });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateProfile: async (data: UserProfileUpdate) => {
    set({ isLoading: true });
    try {
      const {
        data: { user },
        error,
      } = await updateUserProfile(data);
      if (error) throw error;
      if (user) {
        set({ user }); // Update local user state immediately
      }
    } finally {
      set({ isLoading: false });
    }
  },
  changePassword: async (password: string) => {
    set({ isLoading: true });
    try {
      const { error } = await authChangePassword(password);
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  forgotPassword: async (email) => {
    set({ isLoading: true });
    try {
      const redirectTo = Linking.createURL("/forgot-password");
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

    // Clear all user-specific data before signing out
    await clearUserData();

    await supabase.auth.signOut();
    set({ user: null, session: null, isLoading: false });
  },
  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      // Call the RPC function to delete the user
      const { error } = await supabase.rpc("delete_user");
      if (error) throw error;

      // Clear all user-specific data before signing out
      await clearUserData();
      await supabase.auth.signOut();
      set({ user: null, session: null, isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },
  initialize: async () => {
    set({ isLoading: true });

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      // If there's an auth error (e.g., invalid refresh token), clear and start fresh
      if (error) {
        console.warn("Session restore failed:", error.message);
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore signOut errors during cleanup
        }
        set({
          session: null,
          user: null,
          initialized: true,
          isLoading: false,
          showTrialPopup: false,
        });
      } else {
        set({
          session,
          user: session?.user ?? null,
          initialized: true,
          isLoading: false,
          showTrialPopup: !!session?.user,
        });
      }
    } catch (err) {
      // Handle any unexpected errors during initialization
      console.warn("Auth initialization error:", err);
      set({
        session: null,
        user: null,
        initialized: true,
        isLoading: false,
        showTrialPopup: false,
      });
    }

    supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const newUser = session?.user ?? null;
        set((state) => ({
          session,
          user: newUser,
          showTrialPopup: _event === "SIGNED_IN" ? true : state.showTrialPopup,
        }));
      },
    );
  },
}));

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const session = useSession();
// ============================================

export const useSession = (): Session | null => useAuthStore((s) => s.session);
export const useUser = (): User | null => useAuthStore((s) => s.user);
export const useAuthIsLoading = (): boolean => useAuthStore((s) => s.isLoading);
export const useAuthInitialized = (): boolean =>
  useAuthStore((s) => s.initialized);
export const useShowTrialPopup = (): boolean =>
  useAuthStore((s) => s.showTrialPopup);
