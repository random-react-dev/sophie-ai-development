import { create } from "zustand";
import { Scenario, SCENARIOS } from "../constants/scenarios";

interface ScenarioState {
  scenarios: Scenario[];
  selectedScenario: Scenario | null;
  practicePhrase: string | null;
  customScenarios: Scenario[];
  searchQuery: string;
  selectedCategory: string;
  scenarioSelectionTimestamp: number; // To force re-renders even if same scenario selected

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  selectScenario: (scenario: Scenario | null) => void;
  setPracticePhrase: (phrase: string | null) => void;
  addCustomScenario: (scenario: Scenario) => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  scenarios: SCENARIOS,
  selectedScenario: null,
  practicePhrase: null,
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
      scenarioSelectionTimestamp: Date.now(),
    }),
  setPracticePhrase: (practicePhrase) =>
    set({
      practicePhrase,
      selectedScenario: null, // Clear scenario when practicing a phrase
      scenarioSelectionTimestamp: Date.now(),
    }),
  addCustomScenario: (scenario) =>
    set((state) => ({
      customScenarios: [scenario, ...state.customScenarios],
      scenarios: [scenario, ...state.scenarios],
    })),
}));

// ============================================
// Atomic Selectors - Reduce unnecessary re-renders
// Usage: const selectedScenario = useSelectedScenario();
// ============================================

export const useSelectedScenario = (): Scenario | null =>
  useScenarioStore((s) => s.selectedScenario);
export const usePracticePhrase = (): string | null =>
  useScenarioStore((s) => s.practicePhrase);
export const useScenarios = (): Scenario[] =>
  useScenarioStore((s) => s.scenarios);
export const useSearchQuery = (): string =>
  useScenarioStore((s) => s.searchQuery);
export const useSelectedCategory = (): string =>
  useScenarioStore((s) => s.selectedCategory);
export const useScenarioSelectionTimestamp = (): number =>
  useScenarioStore((s) => s.scenarioSelectionTimestamp);
