/**
 * Zustand mock that auto-resets all stores between tests.
 * Based on official Zustand testing recommendation.
 *
 * Place this file at __tests__/mocks/zustand.ts and add to jest.config.js:
 *   moduleNameMapper: { '^zustand$': '<rootDir>/__tests__/mocks/zustand.ts' }
 *
 * OR use jest.mock('zustand') in setup.ts pointing here.
 */
import type { StateCreator } from 'zustand';

const { create: actualCreate } =
  jest.requireActual<typeof import('zustand')>('zustand');

// Track all stores for resetting
const storeResetFns = new Set<() => void>();

/**
 * Wrapped create that records initial state for reset.
 */
export const create = (<T>(stateCreator: StateCreator<T, [], []>) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
}) as typeof actualCreate;

/**
 * Reset all tracked stores to initial state.
 * Called automatically in beforeEach via setup.ts.
 */
export function resetAllStores(): void {
  storeResetFns.forEach((fn) => fn());
}

// Auto-reset between tests
beforeEach(() => {
  resetAllStores();
});
