# Share Link Production EAS Handoff

## What Was Fixed

The production app was sharing scenario links like this:

```txt
undefined?token=<scenario-token>
```

This happened because the production EAS build did not have the public share-link base URL configured.

The Cloudflare Worker setup is already complete and working. No Cloudflare change is needed.

## Production EAS Variable

Set this variable in the EAS **production** environment before creating the production build:

```txt
EXPO_PUBLIC_SHARE_BASE_URL=https://share-scenario.vivekmallik1111.workers.dev
```

This is the only production EAS variable added for the share-link fix.

## How To Check It On Mac Mini

From the project folder, run:

```bash
npx eas-cli whoami
```

This confirms the Mac Mini is logged in to the correct Expo/EAS account.

Then run:

```bash
npx eas-cli env:list --environment production
```

Expected result:

```txt
Environment: production
EXPO_PUBLIC_SHARE_BASE_URL=https://share-scenario.vivekmallik1111.workers.dev
```

## If The Variable Is Missing

If `EXPO_PUBLIC_SHARE_BASE_URL` is not shown in the production environment, add it with this command:

```bash
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SHARE_BASE_URL --value https://share-scenario.vivekmallik1111.workers.dev --visibility plaintext
```

Then verify again:

```bash
npx eas-cli env:list --environment production
```

Expected result:

```txt
Environment: production
EXPO_PUBLIC_SHARE_BASE_URL=https://share-scenario.vivekmallik1111.workers.dev
```

## Repo Config

The production build profile in `eas.json` now points to the EAS production environment:

```json
"production": {
  "environment": "production"
}
```

This makes production builds load `EXPO_PUBLIC_SHARE_BASE_URL`.

## Build On Mac Mini

The project manager should build from the Mac Mini where the correct Play Store upload key is already configured.

Use the production profile:

```bash
npx eas-cli build --platform android --profile production
```

After uploading/installing the new build, the shared link should look like:

```txt
https://share-scenario.vivekmallik1111.workers.dev?token=<scenario-token>
```

It must not show:

```txt
undefined?token=<scenario-token>
```
