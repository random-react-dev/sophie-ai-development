import { Router } from 'expo-router';

/**
 * Safely navigates back if possible, otherwise replaces current route with fallback
 * Resolves "The action 'GO_BACK' was not handled by any navigator" error
 */
export function safeGoBack(router: Router, fallbackRoute = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    // Cast to never to satisfy Expo Router's strict typing if needed, 
    // though generic string usually works for runtime routes
    router.replace(fallbackRoute as never);
  }
}
