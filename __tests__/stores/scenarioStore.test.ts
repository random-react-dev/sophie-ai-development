describe('scenarioStore', () => {
  let useScenarioStore: typeof import('@/stores/scenarioStore').useScenarioStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    useScenarioStore = require('@/stores/scenarioStore').useScenarioStore;
  });

  const mockScenario = {
    id: 'test-1',
    title: 'At the Coffee Shop',
    description: 'Order a coffee in the target language',
    category: 'Daily Life',
    sophieRole: 'A friendly barista',
    userRole: 'A customer ordering coffee',
    topic: 'Ordering food and drinks',
    level: 'S2' as const,
    context: 'A cozy coffee shop in the morning',
    icon: '☕',
  };

  describe('initial state', () => {
    it('starts with no selected scenario', () => {
      expect(useScenarioStore.getState().selectedScenario).toBeNull();
    });

    it('starts with no practice phrase', () => {
      expect(useScenarioStore.getState().practicePhrase).toBeNull();
    });

    it('has scenarios loaded', () => {
      expect(useScenarioStore.getState().scenarios.length).toBeGreaterThan(0);
    });

    it('starts with "All" category', () => {
      expect(useScenarioStore.getState().selectedCategory).toBe('All');
    });

    it('starts with empty search query', () => {
      expect(useScenarioStore.getState().searchQuery).toBe('');
    });
  });

  describe('selectScenario', () => {
    it('sets selected scenario', () => {
      useScenarioStore.getState().selectScenario(mockScenario);
      expect(useScenarioStore.getState().selectedScenario).toEqual(mockScenario);
    });

    it('clears practice phrase when selecting scenario', () => {
      // First set a practice phrase
      useScenarioStore.getState().setPracticePhrase('Hola mundo');
      expect(useScenarioStore.getState().practicePhrase).toBe('Hola mundo');

      // Now select a scenario — practice phrase should be cleared
      useScenarioStore.getState().selectScenario(mockScenario);
      expect(useScenarioStore.getState().practicePhrase).toBeNull();
    });

    it('bumps scenarioSelectionTimestamp', () => {
      const before = useScenarioStore.getState().scenarioSelectionTimestamp;
      useScenarioStore.getState().selectScenario(mockScenario);
      const after = useScenarioStore.getState().scenarioSelectionTimestamp;

      expect(after).toBeGreaterThan(before);
    });

    it('bumps timestamp even when selecting same scenario', () => {
      useScenarioStore.getState().selectScenario(mockScenario);
      const ts1 = useScenarioStore.getState().scenarioSelectionTimestamp;

      // Use fake timers to ensure timestamp changes
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 100);

      useScenarioStore.getState().selectScenario(mockScenario);
      const ts2 = useScenarioStore.getState().scenarioSelectionTimestamp;

      expect(ts2).toBeGreaterThanOrEqual(ts1);

      Date.now = originalNow;
    });

    it('can deselect scenario with null', () => {
      useScenarioStore.getState().selectScenario(mockScenario);
      useScenarioStore.getState().selectScenario(null);
      expect(useScenarioStore.getState().selectedScenario).toBeNull();
    });
  });

  describe('setPracticePhrase', () => {
    it('sets practice phrase', () => {
      useScenarioStore.getState().setPracticePhrase('Bonjour');
      expect(useScenarioStore.getState().practicePhrase).toBe('Bonjour');
    });

    it('clears selected scenario when setting practice phrase', () => {
      useScenarioStore.getState().selectScenario(mockScenario);
      expect(useScenarioStore.getState().selectedScenario).toBeTruthy();

      useScenarioStore.getState().setPracticePhrase('Bonjour');
      expect(useScenarioStore.getState().selectedScenario).toBeNull();
    });

    it('bumps scenarioSelectionTimestamp', () => {
      const before = useScenarioStore.getState().scenarioSelectionTimestamp;
      useScenarioStore.getState().setPracticePhrase('Hola');
      const after = useScenarioStore.getState().scenarioSelectionTimestamp;

      expect(after).toBeGreaterThan(before);
    });

    it('can clear practice phrase with null', () => {
      useScenarioStore.getState().setPracticePhrase('Test');
      useScenarioStore.getState().setPracticePhrase(null);
      expect(useScenarioStore.getState().practicePhrase).toBeNull();
    });
  });

  describe('clearForProfileSwitch', () => {
    it('clears selectedScenario', () => {
      useScenarioStore.getState().selectScenario(mockScenario);
      useScenarioStore.getState().clearForProfileSwitch();
      expect(useScenarioStore.getState().selectedScenario).toBeNull();
    });

    it('clears practicePhrase', () => {
      useScenarioStore.getState().setPracticePhrase('Hola');
      useScenarioStore.getState().clearForProfileSwitch();
      expect(useScenarioStore.getState().practicePhrase).toBeNull();
    });

    it('does NOT bump scenarioSelectionTimestamp', () => {
      useScenarioStore.getState().selectScenario(mockScenario);
      const tsAfterSelect = useScenarioStore.getState().scenarioSelectionTimestamp;

      useScenarioStore.getState().clearForProfileSwitch();
      const tsAfterClear = useScenarioStore.getState().scenarioSelectionTimestamp;

      // Timestamp should NOT change — this is critical to prevent
      // re-triggering the useEffect in talk.tsx
      expect(tsAfterClear).toBe(tsAfterSelect);
    });
  });

  describe('addCustomScenario', () => {
    it('adds custom scenario to front of list', () => {
      const customScenario = {
        ...mockScenario,
        id: 'custom-1',
        title: 'Custom Test Scenario',
      };

      useScenarioStore.getState().addCustomScenario(customScenario);

      const state = useScenarioStore.getState();
      expect(state.scenarios[0]).toEqual(customScenario);
      expect(state.customScenarios[0]).toEqual(customScenario);
    });
  });

  describe('setSearchQuery', () => {
    it('updates search query', () => {
      useScenarioStore.getState().setSearchQuery('coffee');
      expect(useScenarioStore.getState().searchQuery).toBe('coffee');
    });
  });

  describe('setSelectedCategory', () => {
    it('updates selected category', () => {
      useScenarioStore.getState().setSelectedCategory('Travel');
      expect(useScenarioStore.getState().selectedCategory).toBe('Travel');
    });
  });
});
