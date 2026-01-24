import { CreateProfileDTO, LearningProfile, createProfile, deleteProfile, getProfiles, setProfileActive } from '@/services/supabase/profiles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ProfileState {
    profiles: LearningProfile[];
    activeProfile: LearningProfile | null;
    isLoading: boolean;

    fetchProfiles: () => Promise<void>;
    addProfile: (data: CreateProfileDTO) => Promise<boolean>;
    removeProfile: (id: string) => Promise<boolean>;
    switchProfile: (id: string) => Promise<void>;
    clearActiveProfile: () => void;
    reset: () => void;
}

const initialState = {
    profiles: [] as LearningProfile[],
    activeProfile: null as LearningProfile | null,
    isLoading: false,
};

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            ...initialState,

            fetchProfiles: async () => {
                set({ isLoading: true });
                try {
                    const profiles = await getProfiles();
                    set({ profiles });

                    // Sync active profile
                    const active = profiles.find(p => p.is_active);
                    if (active) {
                        set({ activeProfile: active });
                    } else if (profiles.length > 0 && !get().activeProfile) {
                        // If no active flag in DB but we have profiles, set first as active
                        // calling switchProfile to update DB
                        get().switchProfile(profiles[0].id);
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            addProfile: async (data: CreateProfileDTO) => {
                set({ isLoading: true });
                try {
                    const newProfile = await createProfile(data);
                    if (newProfile) {
                        // When creating a new profile, make it active
                        await get().switchProfile(newProfile.id);
                        await get().fetchProfiles(); // Refresh list
                        return true;
                    }
                    return false;
                } finally {
                    set({ isLoading: false });
                }
            },

            removeProfile: async (id: string) => {
                set({ isLoading: true });
                try {
                    const success = await deleteProfile(id);
                    if (success) {
                        set(state => ({
                            profiles: state.profiles.filter(p => p.id !== id),
                            activeProfile: state.activeProfile?.id === id ? null : state.activeProfile
                        }));

                        // If we deleted the active profile, switch to another if available
                        const remaining = get().profiles;
                        if (remaining.length > 0 && !get().activeProfile) {
                            get().switchProfile(remaining[0].id);
                        }
                        return true;
                    }
                    return false;
                } finally {
                    set({ isLoading: false });
                }
            },

            switchProfile: async (id: string) => {
                set({ isLoading: true });
                try {
                    const updatedProfile = await setProfileActive(id);
                    if (updatedProfile) {
                        set(state => ({
                            activeProfile: updatedProfile,
                            profiles: state.profiles.map(p =>
                                p.id === id ? updatedProfile : { ...p, is_active: false }
                            )
                        }));
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            clearActiveProfile: () => set({ activeProfile: null }),

            reset: () => set(initialState)
        }),
        {
            name: 'profile-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ activeProfile: state.activeProfile }), // Only persist active profile locally for quick load
        }
    )
);

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const profiles = useProfiles();
// ============================================

export const useProfiles = (): LearningProfile[] =>
    useProfileStore((s) => s.profiles);
export const useActiveProfile = (): LearningProfile | null =>
    useProfileStore((s) => s.activeProfile);
export const useProfileIsLoading = (): boolean =>
    useProfileStore((s) => s.isLoading);
