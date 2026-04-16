// Shared Apple JWS verifier setup for Supabase Edge Functions (Deno).
//
// Loads Apple's root CA certificates from `./apple-certs/*.cer` (DER bytes)
// and constructs a `SignedDataVerifier` from `@apple/app-store-server-library`.
//
// Required env vars:
//   APPLE_BUNDLE_ID  - e.g. "ai.speakwithsophie.app"
//   APPLE_APP_ID     - numeric Apple ID from App Store Connect > App Information
//
// NOTE on npm interop: `@apple/app-store-server-library` is a CommonJS-ish
// package; Deno's `npm:` specifier handles it but the public surface area is
// re-exported as named ESM imports. If a future Deno/Supabase runtime change
// breaks this import, the workaround is to import the default and destructure:
//   import lib from 'npm:@apple/app-store-server-library@1.4.0';
//   const { SignedDataVerifier, Environment } = lib;

import {
  SignedDataVerifier,
  Environment,
} from 'npm:@apple/app-store-server-library@1.4.0';

const CERT_FILES = [
  'AppleIncRootCertificate.cer',
  'AppleComputerRootCertificate.cer',
  'AppleRootCA-G2.cer',
  'AppleRootCA-G3.cer',
];

let cachedRootCerts: Uint8Array[] | null = null;

async function loadRootCerts(): Promise<Uint8Array[]> {
  if (cachedRootCerts) return cachedRootCerts;
  const certs: Uint8Array[] = [];
  for (const file of CERT_FILES) {
    const url = new URL(`./apple-certs/${file}`, import.meta.url);
    try {
      const bytes = await Deno.readFile(url);
      certs.push(bytes);
    } catch (err) {
      console.error(`apple-verifier: failed to load cert ${file}:`, err);
    }
  }
  if (certs.length === 0) {
    throw new Error('apple-verifier: no Apple root certificates loaded');
  }
  cachedRootCerts = certs;
  return certs;
}

/**
 * Build a SignedDataVerifier. We default to Sandbox; the verifier itself
 * accepts both Sandbox and Production JWS payloads when configured for the
 * environment of the issuer. Callers that need to switch (e.g. webhook in
 * production) can pass `Environment.PRODUCTION`.
 */
export async function getVerifier(
  env: Environment = Environment.SANDBOX,
): Promise<SignedDataVerifier> {
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  const appAppleIdRaw = Deno.env.get('APPLE_APP_ID');
  if (!bundleId) throw new Error('APPLE_BUNDLE_ID env var is required');
  if (!appAppleIdRaw) throw new Error('APPLE_APP_ID env var is required');
  const appAppleId = Number(appAppleIdRaw);
  if (!Number.isFinite(appAppleId)) {
    throw new Error('APPLE_APP_ID must be numeric');
  }

  const rootCerts = await loadRootCerts();

  // Args: (appleRootCertificates, enableOnlineChecks, environment, bundleId, appAppleId)
  return new SignedDataVerifier(
    rootCerts,
    /* enableOnlineChecks */ true,
    env,
    bundleId,
    appAppleId,
  );
}

export { Environment };
