import { getUserStats, incrementStats } from '@/services/supabase/stats';
import { create } from 'zustand';

interface StatsState {
    totalSpeakingSeconds: number;
    totalConversations: number;
    isLoading: boolean;

    // Actions
    fetchStats: () => Promise<void>;
    recordSession: (durationSeconds: number) => Promise<boolean>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
    totalSpeakingSeconds: 0,
    totalConversations: 0,
    isLoading: false,

    fetchStats: async () => {
        set({ isLoading: true });
        try {
            const stats = await getUserStats();
            if (stats) {
                set({
                    totalSpeakingSeconds: stats.total_speaking_seconds || 0,
                    totalConversations: stats.total_conversations || 0
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    recordSession: async (durationSeconds: number) => {
        try {
            // Optimistic update
            set(state => ({
                totalSpeakingSeconds: state.totalSpeakingSeconds + durationSeconds,
                totalConversations: state.totalConversations + 1
            }));

            const success = await incrementStats(durationSeconds, 1);
            if (!success) {
                // Revert on failure (simple revert, though theoretically could be out of sync if multiple updates happening)
                set(state => ({
                    totalSpeakingSeconds: state.totalSpeakingSeconds - durationSeconds,
                    totalConversations: state.totalConversations - 1
                }));
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error recording session:', error);
            return false;
        }
    }
}));

// ============================================
// Atomic Selectors
// ============================================

export const useTotalSpeakingSeconds = () => useStatsStore(s => s.totalSpeakingSeconds);
export const useTotalConversations = () => useStatsStore(s => s.totalConversations);
export const useStatsLoading = () => useStatsStore(s => s.isLoading);
