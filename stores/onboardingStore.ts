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
  preferredLanguage: string;
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
  preferredLanguage: "",
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
