import { create } from "zustand";

export type OnboardingStep =
  | "profile"
  | "goal"
  | "speed"
  | "duration"
  | "level"
  | "confidence"
  | "barriers"
  | "focus"
  | "discovery"
  | "completion";

export interface OnboardingData {
  name: string;
  country: string;
  nativeLanguage: string;
  learningLanguage: string;
  mainGoal: string;
  fluencySpeed: string;
  learningDuration: string;
  speakingLevel: string;
  confidenceLevel: number;
  barriers: string[];
  focusAreas: string[];
  discoverySource: string;
}

interface OnboardingState {
  currentStep: number;
  data: OnboardingData;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (updates: Partial<OnboardingData>) => void;
  resetOnboarding: () => void;
}

const initialData: OnboardingData = {
  name: "",
  country: "",
  nativeLanguage: "",
  learningLanguage: "",
  mainGoal: "",
  fluencySpeed: "",
  learningDuration: "",
  speakingLevel: "",
  confidenceLevel: 1, // 1-5 scale (Nervous to Confident)
  barriers: [],
  focusAreas: [],
  discoverySource: "",
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  currentStep: 1,
  data: initialData,
  setStep: (step: number) => set({ currentStep: step }),
  nextStep: () =>
    set((state) => ({ currentStep: Math.min(state.currentStep + 1, 10) })),
  prevStep: () =>
    set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
  updateData: (updates: Partial<OnboardingData>) =>
    set((state) => ({ data: { ...state.data, ...updates } })),
  resetOnboarding: () => set({ currentStep: 1, data: initialData }),
}));

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const currentStep = useCurrentStep();
// ============================================

export const useCurrentStep = (): number =>
  useOnboardingStore((s) => s.currentStep);
export const useOnboardingData = (): OnboardingData =>
  useOnboardingStore((s) => s.data);
