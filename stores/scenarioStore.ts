import { create } from 'zustand';
import { Scenario, SCENARIOS, CEFRLevel } from '../constants/scenarios';

interface ScenarioState {
    scenarios: Scenario[];
    selectedScenario: Scenario | null;
    customScenarios: Scenario[];
    searchQuery: string;
    selectedCategory: string;
    
    setSearchQuery: (query: string) => void;
    setSelectedCategory: (category: string) => void;
    selectScenario: (scenario: Scenario | null) => void;
    addCustomScenario: (scenario: Scenario) => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
    scenarios: SCENARIOS,
    selectedScenario: null,
    customScenarios: [],
    searchQuery: '',
    selectedCategory: 'All',

    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
    selectScenario: (selectedScenario) => set({ selectedScenario }),
    addCustomScenario: (scenario) => set((state) => ({ 
        customScenarios: [scenario, ...state.customScenarios],
        scenarios: [scenario, ...state.scenarios]
    })),
}));
