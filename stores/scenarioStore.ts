import { create } from "zustand";
import { Scenario, SCENARIOS } from "../constants/scenarios";

export type TalkMode = "guided" | "free_speaking";

interface ScenarioState {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  practicePhrase: string | null;
  talkMode: TalkMode;
  customScenarios: Scenario[];
  searchQuery: string;
  selectedCategory: string;
  scenarioSelectionTimestamp: number; // To force re-renders even if same scenario selected

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  selectScenario: (scenario: Scenario | null) => void;
  setPracticePhrase: (phrase: string | null) => void;
  setTalkMode: (mode: TalkMode) => void;
  clearForProfileSwitch: () => void;
  addCustomScenario: (scenario: Scenario) => void;
  updateScenarioShareToken: (scenarioId: string, shareToken: string) => void;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage, persist } from "zustand/middleware";

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      scenarios: SCENARIOS,
      selectedScenario: null,
      practicePhrase: null,
      talkMode: "guided",
      customScenarios: [],
      searchQuery: "",
      selectedCategory: "All",

      scenarioSelectionTimestamp: 0,

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      selectScenario: (selectedScenario) =>
        set({
          selectedScenario,
          practicePhrase: null, // Clear practice phrase when selecting a scenario
          talkMode: "guided",
          scenarioSelectionTimestamp: Date.now(),
        }),
      setPracticePhrase: (practicePhrase) =>
        set({
          practicePhrase,
          selectedScenario: null, // Clear scenario when practicing a phrase
          talkMode: "guided",
          scenarioSelectionTimestamp: Date.now(),
        }),
      setTalkMode: (talkMode) =>
        set({
          talkMode,
          selectedScenario: null,
          practicePhrase: null,
          scenarioSelectionTimestamp: Date.now(),
        }),
      clearForProfileSwitch: () =>
        set({
          selectedScenario: null,
          practicePhrase: null,
          talkMode: "guided",
          // No timestamp bump — avoids re-triggering the useEffect in talk.tsx
        }),
      addCustomScenario: (scenario) =>
        set((state) => ({
          customScenarios: [scenario, ...state.customScenarios],
          scenarios: [scenario, ...state.scenarios],
        })),
      updateScenarioShareToken: (scenarioId, shareToken) =>
        set((state) => {
          const update = (s: Scenario): Scenario =>
            s.id === scenarioId ? { ...s, shareToken } : s;
          return {
            customScenarios: state.customScenarios.map(update),
            scenarios: state.scenarios.map(update),
          };
        }),
    }),
    {
      name: "scenario-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ customScenarios: state.customScenarios }), // Only persist custom scenarios
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Merge persisted custom scenarios with static SCENARIOS
          state.scenarios = [...state.customScenarios, ...SCENARIOS];
        }
      },
    },
  ),
);

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const selectedScenario = useSelectedScenario();
// ============================================

export const useSelectedScenario = (): Scenario | null =>
  useScenarioStore((s) => s.selectedScenario);
export const usePracticePhrase = (): string | null =>
  useScenarioStore((s) => s.practicePhrase);
export const useTalkMode = (): TalkMode => useScenarioStore((s) => s.talkMode);
export const useScenarios = (): Scenario[] =>
  useScenarioStore((s) => s.scenarios);
export const useSearchQuery = (): string =>
  useScenarioStore((s) => s.searchQuery);
export const useSelectedCategory = (): string =>
  useScenarioStore((s) => s.selectedCategory);
export const useScenarioSelectionTimestamp = (): number =>
  useScenarioStore((s) => s.scenarioSelectionTimestamp);
