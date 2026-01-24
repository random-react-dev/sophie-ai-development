import { create } from 'zustand';

interface GameState {
    totalXp: number;
    streakCount: number;
    lastLessonDate: string | null;
    addXp: (amount: number) => void;
    updateStreak: () => void;
    resetStreak: () => void;
    reset: () => void;
}

const initialState = {
    totalXp: 0,
    streakCount: 0,
    lastLessonDate: null as string | null,
};

export const useGameStore = create<GameState>((set) => ({
    ...initialState,
    addXp: (amount: number) => set((state: GameState) => ({ totalXp: state.totalXp + amount })),
    updateStreak: () => set((state: GameState) => ({ streakCount: state.streakCount + 1, lastLessonDate: new Date().toISOString() })),
    resetStreak: () => set({ streakCount: 0 }),
    reset: () => set(initialState),
}));

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const totalXp = useTotalXp();
// ============================================

export const useTotalXp = (): number =>
    useGameStore((s) => s.totalXp);
export const useStreakCount = (): number =>
    useGameStore((s) => s.streakCount);
export const useLastLessonDate = (): string | null =>
    useGameStore((s) => s.lastLessonDate);
