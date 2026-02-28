import { Platform } from 'react-native';

/**
 * Set Platform.OS for cross-platform branch testing.
 * Call in beforeEach() to test iOS vs Android code paths.
 */
export function setPlatform(os: 'ios' | 'android' | 'web'): void {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}
