import { create } from 'zustand';
import { Scenario, SCENARIOS } from '../constants/scenarios';

interface ScenarioState {
    scenarios: Scenario[];
    selectedScenario: Scenario | null;
    practicePhrase: string | null;
    customScenarios: Scenario[];
    searchQuery: string;
    selectedCategory: string;
    
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
    searchQuery: '',
    selectedCategory: 'All',

    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
    selectScenario: (selectedScenario) => set({ 
        selectedScenario,
        practicePhrase: null // Clear practice phrase when selecting a scenario
    }),
    setPracticePhrase: (practicePhrase) => set({ 
        practicePhrase,
        selectedScenario: null // Clear scenario when practicing a phrase
    }),
    addCustomScenario: (scenario) => set((state) => ({ 
        customScenarios: [scenario, ...state.customScenarios],
        scenarios: [scenario, ...state.scenarios]
    })),
}));
