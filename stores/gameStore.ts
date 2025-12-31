import { create } from 'zustand';

interface GameState {
    totalXp: number;
    streakCount: number;
    lastLessonDate: string | null;
    addXp: (amount: number) => void;
    updateStreak: () => void;
    resetStreak: () => void;
}

export const useGameStore = create<GameState>((set) => ({
    totalXp: 1250, // Mock initial data
    streakCount: 5, // Mock initial data
    lastLessonDate: new Date().toISOString(), // Today
    addXp: (amount: number) => set((state: GameState) => ({ totalXp: state.totalXp + amount })),
    updateStreak: () => set((state: GameState) => ({ streakCount: state.streakCount + 1, lastLessonDate: new Date().toISOString() })),
    resetStreak: () => set({ streakCount: 0 }),
}));
