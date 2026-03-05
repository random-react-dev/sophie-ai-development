import {
  UserProfileUpdate,
  changePassword as authChangePassword,
  signInWithGoogle as authSignInWithGoogle,
  send2FACode,
  updateUserProfile,
} from "@/services/supabase/auth";
import { supabase } from "@/services/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { create } from "zustand";
import { useConversationStore, useIntroStore } from "./conversationStore";
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
    "vocabulary-storage",
    "sophie-intro-state",
  ]);

  // Reset in-memory and persisted stores to initial state
  useTranslationHistoryStore.getState().reset();
  useProfileStore.getState().reset();
  useLearningStore.getState().reset();
  useVocabularyStore.setState({ items: [], folders: [], isLoading: false });
  useStatsStore.getState().reset();
  useConversationStore.getState().reset();
  useIntroStore.getState().setHasSeenIntro(false);
  useGameStore.getState().reset();
};

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  initialized: boolean;
  showTrialPopup: boolean;
  pending2FA: boolean;
  pending2FAEmail: string | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setShowTrialPopup: (show: boolean) => void;
  setPending2FA: (pending: boolean, email?: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  verify2FA: (token: string) => Promise<void>;
  resend2FACode: () => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  initialized: false,
  showTrialPopup: false,
  pending2FA: false,
  pending2FAEmail: null,
  setSession: (session: Session | null) => set({ session }),
  setUser: (user: User | null) => set({ user }),
  setShowTrialPopup: (show: boolean) => set({ showTrialPopup: show }),
  setPending2FA: (pending: boolean, email?: string | null) =>
    set({ pending2FA: pending, pending2FAEmail: email ?? null }),
  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Check if 2FA is enabled for this user
      const is2FAEnabled =
        data.user?.user_metadata?.two_factor_enabled === true;
      if (is2FAEnabled) {
        // Set pending2FA BEFORE signOut so navigation doesn't redirect
        set({ pending2FA: true, pending2FAEmail: email });
        // Sign out the active session first — signInWithOtp fails silently
        // if there's already an active session from signInWithPassword
        await supabase.auth.signOut();
        const { error: otpError } = await send2FACode(email);
        if (otpError) {
          set({ pending2FA: false, pending2FAEmail: null });
          throw otpError;
        }
      } else {
        set({ showTrialPopup: true });
      }
    } catch (err) {
      set({ pending2FA: false, pending2FAEmail: null });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
  signUp: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (!error) return;

      // Retry once on transient network errors (handles cold-start race condition)
      const isRetryable =
        error.name === "AuthRetryableFetchError" ||
        error.message.toLowerCase().includes("network request failed");

      if (isRetryable) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { error: retryError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (retryError) throw retryError;
        return;
      }

      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await authSignInWithGoogle();
      if (error) throw error;

      // Check if 2FA is enabled for this user
      const is2FAEnabled =
        data.user?.user_metadata?.two_factor_enabled === true;
      if (is2FAEnabled && data.user?.email) {
        // Set pending2FA BEFORE send2FACode to prevent race condition
        set({ pending2FA: true, pending2FAEmail: data.user.email });
        // Sign out the active session — signInWithOtp conflicts with existing sessions
        await supabase.auth.signOut();
        const { error: otpError } = await send2FACode(data.user.email);
        if (otpError) throw otpError;
      } else {
        set({ showTrialPopup: true });
      }
    } catch (err) {
      set({ pending2FA: false, pending2FAEmail: null });
      throw err;
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
  verify2FA: async (token: string) => {
    set({ isLoading: true });
    try {
      const email = get().pending2FAEmail;
      if (!email) throw new Error("No pending 2FA email");
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      set({ pending2FA: false, pending2FAEmail: null, showTrialPopup: true });
    } finally {
      set({ isLoading: false });
    }
  },
  resend2FACode: async () => {
    const email = get().pending2FAEmail;
    if (!email) throw new Error("No pending 2FA email");
    const { error } = await send2FACode(email);
    if (error) throw error;
  },
  updateProfile: async (data: UserProfileUpdate) => {
    console.log("[AuthStore] updateProfile called with:", data);
    set({ isLoading: true });
    try {
      const { error } = await updateUserProfile(data);
      if (error) throw error;

      // Optimistically update local user state with new metadata
      // refreshSession may return stale data due to Supabase propagation delay
      set((state) => {
        if (!state.user) return state;
        return {
          user: {
            ...state.user,
            user_metadata: {
              ...state.user.user_metadata,
              ...data, // Merge the new profile data
            },
          },
        };
      });

      // Also refresh session in background for consistency
      supabase.auth.refreshSession().catch((err) => {
        console.warn("Session refresh warning:", err);
      });
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
    try {
      await clearUserData();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      set({
        user: null,
        session: null,
        isLoading: false,
        pending2FA: false,
        pending2FAEmail: null,
        showTrialPopup: false,
      });
    }
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
    } finally {
      set({
        user: null,
        session: null,
        isLoading: false,
        pending2FA: false,
        pending2FAEmail: null,
        showTrialPopup: false,
      });
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
      async (event: AuthChangeEvent, session: Session | null) => {
        const newUser = session?.user ?? null;

        // When session becomes invalid or user is signed out (including token refresh failures),
        // clear all user data to ensure a clean state for the next login.
        if (event === "SIGNED_OUT" && !get().pending2FA) {
          await clearUserData();
        }

        set((state) => ({
          session,
          user: newUser,
          // Clear showTrialPopup on SIGNED_OUT; preserve on other events.
          // showTrialPopup is set explicitly by signIn, verify2FA, and initialize —
          // NOT here, to avoid showing it during the 2FA signIn flow.
          showTrialPopup:
            event === "SIGNED_OUT" ? false : state.showTrialPopup,
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
export const usePending2FA = (): boolean => useAuthStore((s) => s.pending2FA);
export const usePending2FAEmail = (): string | null =>
  useAuthStore((s) => s.pending2FAEmail);
