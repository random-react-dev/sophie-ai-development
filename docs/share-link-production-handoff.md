# Share Link Production Handoff

## Current Status

Status as of 2026-05-01: fixed in app code for local Expo native builds.

The app is built locally:

- Android: Gradle
- iOS: Xcode
- EAS Cloud is not part of this release path

## Root Cause

The production app shared scenario links like this:

```txt
undefined?token=<scenario-token>
```

The share link code depended directly on:

```txt
EXPO_PUBLIC_SHARE_BASE_URL
```

Local development had enough environment setup to work, but the local release bundle used by Gradle/Xcode did not have this value available. Expo replaces `process.env.EXPO_PUBLIC_*` values when the JavaScript bundle is built, so a missing value can become `undefined` inside the release app.

## Fix

The app now builds share links through `getShareScenarioUrl`.

Before:

```txt
process.env.EXPO_PUBLIC_SHARE_BASE_URL + "?token=" + token
```

After:

```txt
getShareScenarioUrl(token)
```

The helper still uses `EXPO_PUBLIC_SHARE_BASE_URL` when it is set correctly, but falls back to the production Worker URL when it is missing or invalid:

```txt
https://share-scenario.vivekmallik1111.workers.dev
```

This keeps the prototype simple and prevents a broken `undefined?token=...` link from reaching users.

## Local Build Requirement

Keep this value in the local `.env` used before creating Gradle/Xcode release builds:

```txt
EXPO_PUBLIC_SHARE_BASE_URL=https://share-scenario.vivekmallik1111.workers.dev
```

This is a public URL, not a secret.

## Expected Result

When sharing a scenario, the message must include:

```txt
https://share-scenario.vivekmallik1111.workers.dev?token=<scenario-token>
```

It must never include:

```txt
undefined?token=<scenario-token>
```

## Verification

Completed on 2026-05-01:

- `npm test -- --runInBand __tests__/utils/shareScenarioLink.test.ts` passed.
- `npm run typecheck` passed.
- `./node_modules/.bin/eslint .` completed with warnings only.
- `npm run lint` is still blocked locally by the `expo lint`/`unrs-resolver` optional native binding issue, even after reinstalling dependencies and adding the missing platform binding. This is a local lint runner issue; the changed TypeScript files lint cleanly through direct ESLint.

Run before release:

```bash
npm test -- --runInBand __tests__/utils/shareScenarioLink.test.ts
npm run typecheck
npm run lint
```

Manual release check:

1. Install the new Android/iOS release build.
2. Open or create a scenario.
3. Tap share.
4. Confirm the shared message contains the Worker URL and token.
5. Open the link in a browser and confirm the share page loads.
