# Sophie App — Google Play Store Guide

## App Identity

| Field | Value |
|-------|-------|
| **App Name (Play Store)** | Speak With Sophie |
| **Package Name** | `ai.speakwithsophie.app` |
| **Developer Account** | Organization (Apexture Private Limited) |
| **Domain** | speakwithsophie.ai |

## Current State

- **Version**: 1.0.0
- **Latest versionCode**: 6
- **Play Store Status**: Production submitted, pending review
- **Android IAP**: NOT yet wired. See **In-App Purchases (Android)** section below.

---

## In-App Purchases (Android) — progress tracker

Mirrors the iOS IAP architecture (v1.0.2 / build 46) but adapted for Play Billing. `react-native-iap@15.0.2` supports both platforms from the same client code — most UI + hooks are reusable; only the server + admin-side configuration differs.

### Play subscription model (KEY DIFFERENCE from Apple)

Google uses a three-tier model: **Subscription (container) → Base plans → Offers**. Unlike Apple (2 separate products for monthly + semiannual), we use ONE subscription with TWO base plans:

| Level | ID | Notes |
|---|---|---|
| Subscription container | `ai.speakwithsophie.app.premium` | Sophie Premium — user-visible name |
| Base plan (monthly) | `premium-monthly` | 1 month auto-renewing, USD $7.99 |
| Base plan (semi-annual) | `premium-semiannual` | 6 months auto-renewing, USD $11.99 |
| Offer (on monthly only) | `free-trial-7d` | 7-day free trial, new-customer eligibility |

All IDs are **immutable** once created in Play Console. Lock them with the developer before the admin creates anything.

### Admin setup doc (handover to non-technical admin)

**`docs/PLAYCONSOLE_IAP_SETUP.md`** — detailed 13-step walkthrough of every click in Play Console + Google Cloud Console. Equivalent of `docs/APPSTORECONNECT_IAP_SETUP.md` for Android. Covers:

1. Payments profile + banking + tax (Apexture Pvt Ltd, India)
2. Link Google Cloud project to Play Console
3. Create service account (for `androidpublisher` API) + download JSON key
4. Find package name + confirm app exists
5. Create subscription `Sophie Premium`
6. Create base plan `premium-monthly` + price $7.99
7. Create base plan `premium-semiannual` + price $11.99
8. Add 7-day free trial offer on the monthly base plan
9. Activate subscription + base plans + offer
10. (deferrable) Set up Pub/Sub topic for Real-Time Developer Notifications (RTDN)
11. Add license testers
12. Hand off credentials to developer
13. (at submission time) Complete App Content + submit to Production

### Admin-side progress checklist

- [ ] Payments profile **Active**, bank **Verified**, tax forms **Active** (Step 1)
- [ ] Google Cloud project created + linked to Play Console (Step 2)
- [ ] Service account created + JSON key delivered securely to developer (Step 3)
- [ ] Subscription `ai.speakwithsophie.app.premium` created + activated (Steps 5, 9)
- [ ] Base plans `premium-monthly` + `premium-semiannual` created + activated (Steps 6, 7, 9)
- [ ] Offer `free-trial-7d` created + activated on monthly (Step 8, 9)
- [ ] License tester account(s) added (Step 11)
- [ ] (After dev deploys webhook) RTDN Pub/Sub topic + push subscription configured (Step 10)
- [ ] App Access demo account added: `appreview@speakwithsophie.ai` (Step 13)
- [ ] Data safety section completed (Step 13)

### Dev-side progress checklist

- [ ] Android wiring of `fetchProducts({ skus, type: 'subs' })` — verify Android returns `subscriptionOfferDetailsAndroid` with `offerToken`
- [ ] Android `requestPurchase` passes `subscriptionOffers: [{ sku, offerToken }]` alongside `skus`
- [ ] `finishTransaction(purchase, isConsumable=false)` wired to ack within 3 days (REQUIRED — unacked subs are auto-refunded)
- [ ] New Supabase edge function `verify-play-purchase` (JWT-verified) — validates `purchaseToken` via `purchases.subscriptionsv2.get`
- [ ] New Supabase edge function `play-webhook` (`--no-verify-jwt`) — receives RTDN messages; decodes Pub/Sub envelope; dedupes on `messageId`; verifies OIDC JWT from Pub/Sub
- [ ] New DB table `public.google_subscriptions` (analog to `public.apple_subscriptions`) — tracked by `purchase_token` OR `product_id` + `user_id`
- [ ] Daily Talk-minutes gate (`check-talk-quota` edge function) already in place from iOS — needs update to also consult `google_subscriptions`
- [ ] Subscribe screen banner/hardening already done on iOS — confirm it works on Android products too (same React code)

### Tech references (dev-side)

- Architecture + RTDN codes + API shapes: see memory file `project_google_play_iap_architecture.md` in the `memory/` folder.
- `react-native-iap` v15 Android API docs: <https://hyochan.github.io/react-native-iap/llms-full.txt>
- `purchases.subscriptionsv2.get` endpoint: <https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get>
- Play Billing acknowledgement rule (3-day auto-refund if missed): <https://developer.android.com/google/play/billing/integrate>

### Known constraints

- New Play submissions must target **API 35+** AND use **Billing Library 7.0.0+**. `react-native-iap@15.0.2` bundles Billing 7.x → satisfies.
- Google **does not require products to be attached to a specific build** (unlike Apple). Any activated subscription is immediately queryable from any app version that has matching package name + Billing integration.
- Google review is mostly automated — reviewers do not typically manually subscribe (unlike Apple). But they CAN, so demo account must work.
- License testers see **accelerated renewal**: 1 month → 5 min, 1 year → 30 min, free trial → 3 min. Max 6 renewals per purchase.
- Unacknowledged purchases are **auto-refunded after 3 minutes** for testers, **3 days** for real users. The client MUST call `finishTransaction`.

### Activation order (launch day)

1. Admin: finish Steps 1–9 of `PLAYCONSOLE_IAP_SETUP.md` + send credentials to dev.
2. Dev: implement Android side, deploy `verify-play-purchase` + `play-webhook` edge functions.
3. Dev: give admin the webhook URL.
4. Admin: finish Step 10 (RTDN topic + push subscription).
5. Dev: upload AAB with billing integration to Internal Testing.
6. Admin + dev: test purchase + trial + renew + cancel flows with license testers.
7. Admin: complete Step 13 (App Content + submit to Production).

## Key Files

- **`app.config.ts`** — Contains `android.package`, `android.versionCode`, `version`
- **`plugins/withAndroidReleaseSigning.js`** — Expo config plugin that injects release signing into `build.gradle`
- **`android/`** — Generated by `npx expo prebuild`. Never manually edit. Always regenerate.
- **`~/.gradle/gradle.properties`** — Stores signing credentials (outside repo)

## Config Details (app.config.ts)

The Android section should always include:

```typescript
android: {
    adaptiveIcon: { ... },
    package: "ai.speakwithsophie.app",
    versionCode: X,  // INCREMENT this for every Play Store upload
    permissions: ["android.permission.RECORD_AUDIO"],
},
```

The signing plugin must be registered in the plugins array:

```typescript
plugins: [
    "./plugins/withAndroidReleaseSigning",
    // ... other plugins
],
```

---

## One-Time Setup

### 1. Keystore Location

The release upload keystore lives **outside** the project so `expo prebuild --clean` won't delete it:

```
~/.android/keystores/sophie-upload-key.keystore
```

If you ever need to regenerate it:

```bash
keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 \
  -validity 10000 -storepass <password> -keypass <password> \
  -alias sophie-upload-key \
  -keystore ~/.android/keystores/sophie-upload-key.keystore \
  -dname "CN=Speak With Sophie, O=Apexture Private Limited"
```

After regenerating, you must register the new upload key in **Play Console > Setup > App signing**.

**CRITICAL: Save the keystore password in a password manager immediately. If you lose it, you'll need to request an upload key reset from Google (takes days).**

### 2. Configure Signing Credentials

Create or edit `~/.gradle/gradle.properties` (your HOME directory, NOT the project):

```properties
SOPHIE_UPLOAD_STORE_FILE=/Users/niravramani/.android/keystores/sophie-upload-key.keystore
SOPHIE_UPLOAD_KEY_ALIAS=sophie-upload-key
SOPHIE_UPLOAD_STORE_PASSWORD=<your_password>
SOPHIE_UPLOAD_KEY_PASSWORD=<your_password>
```

### 3. Create App in Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Click **"Create app"**
3. Fill in:
   - **App name**: Speak With Sophie
   - **Default language**: English (US)
   - **App or game**: App
   - **Free or paid**: Free
4. Accept declarations and click **Create app**

---

## How to Build & Upload a Release

### 1. Increment `versionCode` in `app.config.ts`

Each Play Store upload MUST have a unique, ever-increasing versionCode:
- 1 → 2 → 3 → 4 ...

The `version` (e.g., "1.0.0") only needs to change for new user-facing releases.

### 2. Regenerate Android folder

```bash
npx expo prebuild --platform android --clean
```

### 3. Build the release AAB

```bash
cd android && ./gradlew app:bundleRelease
```

**Output file:** `android/app/build/outputs/bundle/release/app-release.aab`

### 4. (Optional) Test on device first

```bash
npx expo run:android --variant release
```

### 5. Upload to Play Console

1. Go to the appropriate testing track (Internal / Closed / Production)
2. Click **"Create new release"**
3. Upload the `app-release.aab` file
4. Add release notes
5. Review and start rollout

## Quick Command Reference

```bash
# Full rebuild + build AAB workflow
npx expo prebuild --platform android --clean && cd android && ./gradlew app:bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Store Listing Checklist

| Item | Requirements |
|------|-------------|
| **App icon** | 512 x 512 px, 32-bit PNG (high-res) |
| **Feature graphic** | 1024 x 500 px, JPG or 24-bit PNG, no transparency |
| **Phone screenshots** | 2-8 screenshots at 1080 x 1920 px (portrait) |
| **Short description** | Max 80 characters |
| **Full description** | Max 4000 characters |
| **Category** | Education |
| **Privacy policy URL** | Your existing public URL |

## App Content Section (Policy)

In Play Console under **Policy > App content**, complete ALL of:

1. **Privacy policy** — Enter your public URL
2. **Content rating** — Complete IARC questionnaire (AI language tutor: no violence, no sexual content, user interaction with AI, audio data collection)
3. **Data safety** — Declare:
   - Audio data: collected, shared with Gemini API for processing
   - Email/account data: collected via Supabase
   - Whether data can be deleted by user
4. **Target audience** — Declare age groups
5. **Foreground service permissions** — Declare `FOREGROUND_SERVICE_MICROPHONE` and `FOREGROUND_SERVICE_MEDIA_PLAYBACK`. You may need to submit a short video showing usage.

---

## Testing Tracks Explained

| | Internal Testing | Closed Testing | Production |
|---|---|---|---|
| **Purpose** | Quick dev/QA iteration | Required gate for production (personal accounts) | Public release |
| **Build availability** | Seconds (no review) | May take hours (Google reviews) | Full review |
| **Max testers** | 100 | Large (email lists / Google Groups) | Everyone |
| **Counts toward 14-day requirement?** | NO | YES | N/A |

**Key distinction**: Internal testing does **NOT** count toward the 14-day requirement. Only **Closed Testing** counts.

> **Your account**: Organization (Apexture) — you can skip closed testing and publish directly to production. No 14-day wait required.

---

## Step-by-Step: Testing & Publishing

### Step 1: Add Testers to Internal Testing (for quick validation)

Your AAB is already uploaded to Internal Testing. Now add testers:

1. On the Internal Testing page, click **"Create email list"**
2. Give it a name (e.g., "Sophie Testers")
3. Add Gmail addresses — start with your own + anyone on your team
4. Click **Save** → check the box next to the list → **Save changes**
5. Click **"Copy link"** at the bottom (the opt-in URL)
6. Send that link to your testers

### Step 2: How Testers Install the App

1. Tester receives the opt-in link you shared
2. They open it in a browser **while signed into their Gmail account**
3. They click **"Accept invite"** on the Google Play page
4. A **"Download it on Google Play"** button appears → takes them to the Play Store
5. They install the app normally from the Play Store
6. Note: It can take a few minutes after you add testers before the link works

### Step 3: Set Up Closed Testing (starts the 14-day clock)

**Only needed for personal developer accounts.** If organization account, skip to production.

1. Go to **Testing > Closed testing** in the left sidebar
2. Click **"Create track"** (or use the default "Closed testing - Alpha" track)
3. Click **"Create new release"** → Upload the same `app-release.aab`
4. Add release notes → **Review** → **Start rollout**
5. Go to **Testers** tab → Create email list with **12+ Gmail addresses**
6. All 12 testers must click the opt-in link and accept
7. The 14-day countdown starts once all 12 are opted in
8. After 14 days → Go to **Dashboard** → click **"Apply for production access"**
9. Google reviews this (takes up to 7 days)

**The 14-day wait cannot be shortened — plan accordingly.**

### Step 4: Complete "Set up your app" Tasks

These must be done regardless of testing track. Go to **Dashboard > View tasks**:

- **Store listing**: App name, descriptions, icon, screenshots, feature graphic (see checklist below)
- **Content rating**: IARC questionnaire (Education/Utility, answer No to most)
- **Data safety**: Declare email, audio, app activity collection
- **Privacy policy**: Public URL required
- **Target audience**: Select 18+
- **Ads**: No ads

---

## Recommended Strategy

1. **Right now**: Add testers to Internal Testing, validate the app works
2. **Same day**: Set up Closed Testing with 12+ testers to start the 14-day clock in parallel
3. **Meanwhile**: Complete all "Set up your app" tasks (store listing, content rating, etc.)
4. **After 14 days**: Apply for production access

Internal and closed testing tracks can run simultaneously — use internal for fast iteration, closed for the production gate.

---

## Where to Find 12 Testers

- Friends/family with Android phones and Gmail accounts
- Team members
- Online communities (Reddit, Discord)
- Services like BetaFamily or TestersHub
- Testers just need to opt in — they don't necessarily need to actively use the app (though Google may verify some engagement)

---

## Production Release

Once production access is granted:

1. Go to **Production** track
2. Create a new release or promote from closed testing
3. Submit for review
4. Wait 1-7 days for Google's review
5. App goes live on Google Play

---

## Versioning Strategy

| Field | When to Change | Example |
|-------|---------------|---------|
| `version` (in app.config.ts) | New user-facing release | "1.0.0" → "1.1.0" |
| `android.versionCode` (in app.config.ts) | Every Play Store upload | 1 → 2 → 3 |

- `versionCode` must ALWAYS increase (never reuse)
- Multiple uploads can share the same `version`

---

## Play Store Recommendations (versionCode 5)

After submitting versionCode 5, the Play Console flagged two **recommendations** (not blockers):

### 1. Deprecated Edge-to-Edge APIs (Android 15)
- Framework libraries (`react-native`, `react-native-screens`, `expo-dev-launcher`, etc.) use deprecated `setStatusBarColor`/`setNavigationBarColor` APIs
- **No action needed** — these are no-ops on Android 15+ and will be fixed by upstream library updates
- Tracked: [react-native #48256](https://github.com/facebook/react-native/issues/48256), [react-native-screens #2632](https://github.com/software-mansion/react-native-screens/issues/2632)

### 2. Orientation Restrictions on Large Screens (Android 16)
- `android:screenOrientation="portrait"` is ignored on tablets/foldables (>= 600dp) starting Android 16
- **Fix (versionCode 6)**: Added `plugins/withPortraitCompat.js` — Expo config plugin that injects `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` property into AndroidManifest.xml
- This is Google's official temporary opt-out preserving portrait lock on large screens through API 36 (~2027)
- When API 37 drops, we'll need responsive layouts for tablets — but that's a future concern

---

## Important Notes / Gotchas

1. **AAB is mandatory** — Google Play does not accept APK for new apps.
2. **Play App Signing** is automatic for new apps — Google manages the app signing key, you manage the upload key.
3. **Package name is permanent** — `ai.speakwithsophie.app` cannot be changed after the first AAB is uploaded. A new package = a new app listing.
4. **Never manually edit `android/` folder** — Always use `npx expo prebuild --platform android --clean` to regenerate.
5. **Keystore safety** — While Google can reset the upload key, it's a manual process that takes days.
6. **R8/ProGuard** — Left disabled for the first release to avoid potential crashes. Can be enabled later for smaller APK size.

## Troubleshooting

### Build fails with "keystore not found"
- The keystore lives at `~/.android/keystores/sophie-upload-key.keystore` (outside the project)
- Verify `~/.gradle/gradle.properties` has `SOPHIE_UPLOAD_STORE_FILE` set to the absolute path
- If the keystore was accidentally deleted, regenerate it (see One-Time Setup above) and re-register the upload key in Play Console

### "versionCode X has already been used"
- Increment `android.versionCode` in `app.config.ts` — it must always increase

### AAB upload rejected
- Ensure you're uploading `.aab` (not `.apk`)
- Check that the package name matches what's registered in Play Console

### Signing config not applied
- Verify `~/.gradle/gradle.properties` has the `SOPHIE_UPLOAD_*` properties
- Check that `plugins/withAndroidReleaseSigning.js` is registered in `app.config.ts`
- Run `npx expo prebuild --platform android --clean` and inspect `android/app/build.gradle` for `signingConfigs.release`
