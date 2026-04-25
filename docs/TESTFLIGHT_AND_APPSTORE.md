# Sophie App — TestFlight & App Store Guide

## App Identity

| Field | Value |
|-------|-------|
| **App Name (App Store)** | Speak With Sophie |
| **Bundle ID** | `ai.speakwithsophie.app` |
| **Apple Developer Team** | Apexture Private Limited |
| **SKU** | sophie-ai |
| **Domain** | speakwithsophie.ai |

## Current State (as of 2026-04-25)

- **Live Version**: 1.0.1 (build 44) — **APPROVED 2026-04-15** after five rejections in March 2026. Shipped with zero subscription UI.
- **1.0.2 / build 45**: REJECTED 2026-04-20 — Guideline 2.1(b) (Subscribe button silently no-op'd on iPad Air 11-inch).
- **1.0.2 / build 46**: REJECTED 2026-04-20 (second rejection on same date) — TWO issues on iPhone 17 Pro Max / iOS 26.4.1: Guideline 2.1(a) (Apple Sign-In errored) and Guideline 2.1(b) (IAPs still not findable).
- **1.0.2 / build 47**: Code changes complete locally + built on iPhone 17 Pro simulator. **NOT YET uploaded — BLOCKED on Apple-side bug** (see "Rejection Fix #9 (v1.0.2)" below). Apple Developer Support ticket required before upload.
- **TestFlight Status**: Active, internal testing enabled
- **App Store Status**: 1.0.1 live; 1.0.2 rejected on builds 45 + 46; build 47 prepared but blocked on Developer Support response

## Demo account (current — supersedes older `appreview@…` references)

- Email: `armanmishra1000@gmail.com`
- Password: `Arman@99139`
- Contact: Mitesh Paghdal / +919898456150 / speakwithsophieai@gmail.com

## App Store Rejection Fix #1 (v1.0, March 10, 2026)

Four issues were raised by Apple review and fixed:

1. **Sign in with Apple name pre-fill (Guideline 4)** — `ProfileStep.tsx` now pre-fills the name field from `user_metadata.full_name` provided by Apple Sign In.
2. **Third-party AI disclosure (Guideline 2.1 + 5.1.2(i))** — New `AIConsentModal` component (`components/common/AIConsentModal.tsx`) shows a one-time consent prompt naming Google Gemini before Talk or Translate features activate. Consent saved to AsyncStorage.
3. **Session persistence bug (Guideline 2.1(a))** — `startAutoRefresh()` called on startup in `client.ts`; proactive token refresh in `authStore.ts` `initialize()`; spurious SIGNED_OUT guard added to `onAuthStateChange`. Trial countdown modal disabled (no paywall exists yet).
4. **Demo account (Guideline 2.1(a))** — Manual: create `appreview@speakwithsophie.ai` in Supabase, complete onboarding, backdate `created_at`, provide credentials in App Store Connect review info.

**App Store Connect reply for AI questions:**
1. Yes, the app uses third-party AI for analysis of data.
2. Provider: Google Gemini (via Google AI Studio API).
3. Data transmitted: Voice audio (PCM format), text transcripts, conversation history, and language learning context. No PII beyond what the user speaks in conversation.

## App Store Rejection Fix #2 (v1.0, March 12, 2026) — Build 40

Two additional issues raised by Apple review:

1. **Redundant name field (Guideline 4 — Design)** — Apple Sign-In provides the user's name, so showing an editable name input during onboarding is unnecessary data collection. **Fix**: Name input in `ProfileStep.tsx` sub-step 3 is now hidden when `user_metadata.full_name` exists. Validation in `onboarding.tsx` updated to accept Apple-provided name.

2. **Subscription UI without IAP (Guideline 3.1.1)** — App showed subscription plans, trial badges, "Upgrade to Pro" buttons, and payment sections but had no In-App Purchase mechanism. **Fix**: All subscription/trial UI removed:
   - `app/_layout.tsx`: Removed `<TrialCountdownModal />` render and import
   - `app/profile/account.tsx`: Removed Subscription section (Free Trial badge, Upgrade to Pro card) and Payment section (Payment Methods, Billing History). Only Account Info (email, member since) remains.
   - `app/profile/subscription.tsx`: Replaced full plan cards screen with "Subscription plans coming soon." placeholder

**Files NOT deleted** (ready for IAP restoration) — **Note: these were deleted in Fix #5**:
- ~~`components/auth/TrialCountdownModal.tsx`~~ — deleted in Fix #5
- `components/profile/ProfileSettingCard.tsx` — exists but not imported in account.tsx
- ~~`hooks/useTrialGuard.ts`~~ — deleted in Fix #5
- ~~`stores/authStore.ts` trial fields~~ — removed in Fix #5

## App Store Rejection Fix #3 (v1.0, March 16, 2026) — Build 41

Apple rejected again for Guideline 3.1.1. Although subscription UI components were removed in Fix #2, user-visible text still referenced subscriptions:

1. **Account menu subtitle** said "Subscription and billing" in all 20 locale files → changed to "Your account details" (translated per language)
2. **Subscription screen** showed "Upgrade to Pro" title and "Subscription plans coming soon." text → replaced with neutral "Subscription" title and empty screen body
3. **i18n locale files** contained `freeTrial`, `upgradeToPro`, `billingHistory`, `paymentMethods`, `comingSoon` and full plan/pricing keys → removed from all 20 locales
4. **`trial_countdown_modal`** i18n section removed from all 20 locales (dead weight, component not rendered)

**Changes**: `app.config.ts` (buildNumber 40→41), `app/profile/subscription.tsx`, all 20 files in `services/i18n/locales/`

## App Store Rejection Fix #4 (v1.0, March 20, 2026) — Build 42

Apple rejected for Guideline 2.1(a) — App Completeness. The login and signup screens stated users agree to Terms of Service and Privacy Policy, but the text was static with no working links to view the actual documents.

1. **Login screen** (`app/(auth)/login.tsx`): Made "Terms of Service" and "Privacy Policy" text tappable using `<Text onPress>` + `openBrowserAsync()` from `expo-web-browser`. Links open `https://speakwithsophie.ai/terms` and `https://speakwithsophie.ai/privacy` in an in-app browser overlay.
2. **Signup screen** (`app/(auth)/signup.tsx`): Same changes as login, plus fixed typo "Terms to Service" → "Terms of Service". Also made the Step 2 "Terms and Conditions" checkbox text tappable.
3. **Styling**: Changed link text from gray (`text-gray-600`) to blue underlined (`text-blue-500 underline`) so links are visually identifiable as tappable.

**Changes**: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app.config.ts` (buildNumber 41→42)

## App Store Rejection Fix #5 (v1.0, March 23, 2026) — Build 43

Apple rejected again for Guideline 3.1.1 despite previous text cleanup (Fix #3). Root cause: Apple's automated review scans the Hermes bytecode bundle for string literals. Dead/unused subscription infrastructure still produced strings like "subscription", "trial", "upgrade", "pro", "billing" in the compiled binary. A "Subscription" screen also existed in the navigation stack.

**Nuclear cleanup** — deleted ALL subscription/trial/payment code:

1. **`stores/authStore.ts`**: Removed `showTrialPopup`, `setShowTrialPopup`, `checkTrialStatus`, and `useShowTrialPopup` selector. All core auth methods untouched.
2. **`app/(tabs)/_layout.tsx`**: Removed `useTrialGuard` import and trial enforcement `useFocusEffect` block.
3. **`hooks/useTrialGuard.ts`**: Deleted entirely (dead code, always returned true).
4. **`components/auth/TrialCountdownModal.tsx`**: Deleted entirely (never rendered, contained upgrade/plan/discount strings).
5. **`app/profile/subscription.tsx`**: Deleted entirely (empty "Subscription" screen).
6. **`app/profile/_layout.tsx`**: Removed `<Stack.Screen name="subscription" />`.
7. **All 20 locale files**: Removed `subscription_screen` section (last remaining subscription i18n key).

**Files deleted** (previously kept for IAP restoration):
- `components/auth/TrialCountdownModal.tsx`
- `hooks/useTrialGuard.ts`
- `app/profile/subscription.tsx`

Restoration guide for future IAP: `project_subscription_ui_removal.md` (not shipped in app bundle)

**Changes**: `stores/authStore.ts`, `app/(tabs)/_layout.tsx`, `app/profile/_layout.tsx`, all 20 `services/i18n/locales/*.json`, `app.config.ts` (buildNumber 42→43, versionCode 6→7). Three files deleted.

## Rejection Fixes #6 & #7 — 1.0.1 train, Builds 44 resubmitted

After Fix #5 (build 43), the 1.0.0 pre-release train was closed by Apple (error: *"Invalid Pre-Release Train. The train version '1.0.0' is closed for new build submissions"*). We started a fresh 1.0.1 train on 2026-04-14 with build 44. Build 44 was **approved on 2026-04-15** — first approval after five rejections. It shipped with no subscription UI, no trial logic, no paywall.

## Apple IAP (v1.0.2 / Build 45, 2026-04-16)

With 1.0.1 approved, v1.0.2 reintroduces subscriptions — this time with a real Apple IAP implementation that satisfies Guideline 3.1.1.

### Architecture

```
App (react-native-iap v15)
   │ Subscribe tap → requestPurchase({ ios: { sku } })
   │ StoreKit 2 returns signed JWS
   ▼
Supabase Edge Function: verify-purchase (JWT-verified)
   │ Verifies JWS signature via @apple/app-store-server-library
   │ Upserts row into public.apple_subscriptions
   ▼
Client: entitlementStore.refresh() reads active row
   │ isPro() gate available to UI (not yet used for feature gating)
   ▼
Asynchronously: App Store Server Notifications v2
   │ Posted by Apple to apple-webhook (--no-verify-jwt)
   │ Idempotent state reconciliation by original_transaction_id
```

### Products in App Store Connect (subscription group `Sophie Premium`)

| Product ID | Duration | Price | Trial |
|---|---|---|---|
| `ai.speakwithsophie.app.premium.monthly` | 1 month | $7.99 | 7-day free trial (intro offer) |
| `ai.speakwithsophie.app.premium.semiannual` | 6 months | $11.99 | — |

### Backend (Supabase, project `upfivcrszqvbkrchevlq`)

- **Migration**: `supabase/migrations/20260415000000_apple_subscriptions.sql` — creates `public.apple_subscriptions` (NOT `subscriptions`, which is a legacy Stripe table with 1 production row we preserved)
- **Edge Functions**:
  - `verify-purchase` (JWT verification ON) — client-initiated JWS verification
  - `apple-webhook` (deployed with `--no-verify-jwt`) — receives App Store Server Notifications v2
- **Webhook URL** (same for Sandbox and Production): `https://upfivcrszqvbkrchevlq.supabase.co/functions/v1/apple-webhook`
- **Edge Function secrets**: `APPLE_BUNDLE_ID`, `APPLE_APP_ID`. Apple `.p8` key + Issuer ID + Key ID held by admin; not consumed by current functions (reserved for future App Store Server API client calls).

### Client

- **Library**: `react-native-iap@15.0.2` (+ required peer `react-native-nitro-modules`). v15 API differs from v14 — uses `fetchProducts`, `requestPurchase({ request: { ios: { sku } } })`, unified `purchaseToken`.
- **Wrapper**: `services/iap/client.ts` — `initIAP`, `fetchSubscriptionProducts`, `purchase`, `restorePurchases`, `setupPurchaseListeners`.
- **Backend call**: `services/iap/verifyWithBackend.ts` — invokes `verify-purchase` via `supabase.functions.invoke`.
- **Entitlement state**: `stores/entitlementStore.ts` — Zustand store, reads latest row from `apple_subscriptions`, exposes `isPro()`.
- **Listeners**: Mounted in `app/_layout.tsx` on sign-in; AppState foreground triggers `entitlementStore.refresh()`.
- **UI**: `app/profile/subscription.tsx` — three plan cards (Free/Monthly/Semi-annual) with Guideline 3.1.1 disclosures adjacent to each Subscribe button, Restore Purchases button, Terms/Privacy links.

### Expo config

`app.config.ts` plugins array includes `"react-native-iap"` (bare string — v15 plugin accepts no args). No manual entitlements needed — In-App Purchase capability is implicit per bundle ID.

### Deploy workflow (IAP changes)

```bash
# Backend
supabase db push                                             # apply migrations
supabase secrets set APPLE_BUNDLE_ID=... APPLE_APP_ID=...    # one-time
supabase functions deploy verify-purchase                    # JWT ON
supabase functions deploy apple-webhook --no-verify-jwt      # JWT OFF

# Client
# bump version + buildNumber in app.config.ts
npx expo prebuild --platform ios --clean
xed ios
# Product > Archive > Distribute App > App Store Connect
```

### Apple-side setup (admin)

Complete handover doc: **`docs/APPSTORECONNECT_IAP_SETUP.md`** (12 steps, ~2h for a first-time admin). Key collected values:

| Field | Value |
|---|---|
| Apple App ID (numeric) | `6759192122` |
| Apple Issuer ID | `d590525a-2957-47c0-9bf0-c137d84742df` |
| Apple IAP Key ID | `8P9K8546LY` |
| Sandbox tester | created by admin, shared privately |

### Known risks

- **`appAccountToken` not wired**: webhook can't map notifications to a user until `verify-purchase` has created a row. Low-probability race; marked TODO in code.

### Paywall review screenshot

Captured via simulator: `xcrun simctl io <udid> screenshot` on iPhone 16 Pro Max → native 1320×2868 → optionally resized to 1290×2796 with `sips`.

## App Store Rejection Fix #8 (v1.0.2, April 20, 2026) — Build 46

Apple rejected build 45 under **Guideline 2.1(b) — Performance — App Completeness** on iPad Air 11-inch (M3), iPadOS 26.4.1. The reviewer reported: *"no further action produced when we tapped on 'Subscribe'"*.

### Root-cause analysis

Ranked by likelihood (per research of Apple dev forums, react-native-iap issues, and Apple's rejection resources):

1. **IAP products not attached to the v1.0.2 submission** (first-IAP rule). StoreKit returns an empty product list to reviewers if products aren't bound to the binary under review → `fetchProducts` returns `[]` → Subscribe button tapped but SKU isn't fetchable.
2. **Products stuck in "Missing Metadata"** — a single missing subscription-group localization or per-product review screenshot keeps both products hidden from `StoreKit.Product.products(for:)`.
3. **Paid Apps Agreement not in "Active" state** — IAP disabled in sandbox regardless of client code.
4. **iPad compatibility-mode quirk** (Apple Dev Forum 814236) — iPhone-only apps tested on iPad sometimes receive empty products from StoreKit.
5. **Secondary (our fault)**: the client silently no-op'd when products returned empty, producing the exact behavior the reviewer saw.

(Note: `com.apple.developer.in-app-payments` is Apple Pay's entitlement, NOT StoreKit's — StoreKit IAP requires zero entitlements. We intentionally did *not* add this.)

### Fixes in Build 46

**Client hardening** — `app/profile/subscription.tsx`, `services/iap/client.ts`, `services/i18n/locales/en.json`:

- `subscription.tsx` tracks fetched products in component state (`availableSkus: Set<string>`, `productsError`, `productsLoading`). Subscribe button is disabled with "Temporarily Unavailable" label if the SKU isn't in the fetched list. A red error banner with a **Retry** button is shown above the plan list when products fail to load.
- `handlePurchase` now validates the SKU against `availableSkus` before calling `requestPurchase`. If the SKU isn't fetchable, the user sees an error alert — never a silent no-op.
- `services/iap/client.ts` logs `[IAP] fetchProducts returned N products: [...]`, `[IAP] requestPurchase -> <sku>`, `[IAP] purchase listeners mounted`, and `[IAP] purchaseUpdated fired`. These Xcode-console logs distinguish *"products returned empty"* (Apple-side) from *"purchase request silently dropped"* (library-side) on any future rejection.
- New i18n keys: `profile.subscription_screen.errors.unavailable`, `.errors.productNotReady`, `.unavailableBanner.*`, `.quota.*`.

**Feature gating (Guideline 3.1.1 pre-emption)**:

- New migration `supabase/migrations/20260420000000_daily_usage.sql` → creates `public.daily_usage(user_id, date, seconds_used)` with composite PK + RLS (owner-only SELECT; service role writes).
- New edge function `supabase/functions/check-talk-quota/index.ts` (JWT-verified). Returns 200 `{ allowed: true, isPro }` for Pro users (active row in `apple_subscriptions` with `expires_date > now()`), 200 `{ allowed: true, used, cap }` + increments `daily_usage.seconds_used` by 300 (5 min charge-in-advance) for free users under the cap, or 402 `{ reason: 'free_quota_exhausted' }` when free users have used ≥ `FREE_DAILY_CAP_SECONDS` (15 min).
- Client wrapper `services/iap/checkTalkQuota.ts` exposes `checkTalkQuota()` + `TalkQuotaExhaustedError`.
- `app/(tabs)/talk.tsx` calls `checkTalkQuota()` before `getGeminiSessionToken()`. On `TalkQuotaExhaustedError`, shows the upsell `AlertModal` with "Not now" / "See Plans" buttons; "See Plans" routes to `/profile/subscription`.

**Why a new `check-talk-quota` function instead of gating inside `get-gemini-session`** (a deviation from the original plan): production clients resolve `EXPO_PUBLIC_GEMINI_API_KEY` directly and bypass `get-gemini-session` entirely, so modifying that stub would not gate anything. A dedicated quota function called before token fetch is the reliable gate.

### Admin checklist (pre-build-46 upload)

1. **Paid Apps Agreement = Active** (Business → Agreements).
2. Both IAP products **NOT** in "Missing Metadata" state.
3. Subscription group `Sophie Premium` has a **localized Display Name** (English).
4. Each product has its **review screenshot** uploaded.
5. In the v1.0.2 submission, **attach both IAP products** under "In-App Purchases and Subscriptions".
6. Introductory offer (7-day free trial) created on `ai.speakwithsophie.app.premium.monthly`.

See `docs/APPSTORECONNECT_IAP_SETUP.md` for step-by-step screenshots.

### Backend deploy (build 46)

```bash
# Already executed 2026-04-20:
supabase db push                                 # applied 20260420000000_daily_usage
supabase functions deploy check-talk-quota      # deployed to upfivcrszqvbkrchevlq
```

**Changes**: `app.config.ts` (buildNumber 45→46), `app/(tabs)/talk.tsx`, `app/profile/subscription.tsx`, `services/iap/client.ts`, `services/iap/checkTalkQuota.ts` (new), `services/i18n/locales/en.json`, `supabase/functions/check-talk-quota/index.ts` (new), `supabase/migrations/20260420000000_daily_usage.sql` (new).

### Review notes to paste in App Store Connect (v1.0.2 → App Review → Notes)

```
This build fixes the issue from the previous review where tapping Subscribe
produced no action. Root cause: subscription products were not attached to
the previous submission, so StoreKit returned an empty product list to the
reviewer's session. Both subscription products are now attached to this
submission.

Demo account:
- Email: appreview@speakwithsophie.ai
- Password: <set by admin in Supabase>

To test In-App Purchases:
1. Sign in with the demo account above.
2. Navigate: Profile → Subscription.
3. Tap "Subscribe" on either the Monthly or Semi-Annual plan.
4. The App Store purchase sheet will present. A sandbox Apple ID prompt
   will appear — any valid sandbox tester account will work.
5. After purchase, the subscription unlocks unlimited daily Sophie Talk
   conversations (free users are capped at 15 minutes per day).

Product IDs:
- ai.speakwithsophie.app.premium.monthly — $7.99/month, 7-day free trial
- ai.speakwithsophie.app.premium.semiannual — $11.99 per 6 months

Note: this app is designed for iPhone (supportsTablet: false). iPhone-only
apps running on iPad in compatibility mode have documented StoreKit edge
cases (Apple Developer Forums thread 814236). If this cannot be reproduced
on iPhone hardware, please let us know.
```

## App Store Rejection Fix #9 (v1.0.2, April 20, 2026 — same day as #8) — Build 47 in flight

Apple rejected build 46 on 2026-04-20 on **iPhone 17 Pro Max / iOS 26.4.1** with TWO issues. Submission ID: `cf0226b0-bd85-4b0c-92e3-28366f11eca3`.

### Issues raised

1. **Guideline 2.1(a) — Performance — App Completeness**: *"an error occurred when we tried to sign up using Apple"*. New device + new OS combo on Apple's review fleet (iPhone 17 Pro Max / iOS 26.4.1).
2. **Guideline 2.1(b) — Information Needed**: *"we cannot locate the In-App Purchases (Sophie Premium Monthly, Sophie Premium Semiannual, and Sophie Premium 6 Months) within the app at this time"*.

### Root-cause analysis

**For 2.1(a)**: Apple Sign-In code is **byte-identical between builds 45 (passed) and 46 (failed)**. `git diff 3bec27c 859708f -- components/auth/ services/supabase/ app.config.ts app/_layout.tsx stores/authStore.ts ios/` returned ONLY `buildNumber: "45" → "46"`. So the failure is **environment-specific** — Apple's review fleet just added iPhone 17 Pro Max + iOS 26.4.1, and our flow has an OS-specific failure on it. Most likely cause per web research: **OIDC issuer mismatch** — Apple changed ID-token issuer from `appleid.apple.com` to `account.apple.com` in 2025; some Supabase projects' server-side validation lags. Documented in supabase/supabase#43365.

**For 2.1(b)**: User reproduced locally — `[IAP] fetchProducts returned 0 products: []` in dev simulator with the same SKUs. Build 46 client hardening worked as designed (red "unavailable" banner, disabled Subscribe) — only the underlying issue is unresolved. **CONFIRMED via screenshot**: the "In-App Purchases and Subscriptions" section is completely absent from the v1.0.2 version page in App Store Connect. **This is an Apple-acknowledged bug** documented in Apple Developer Forums thread **820936** — Apple Staff publicly acknowledged it and directs affected developers to Developer Support. Apple's new "Add for Review" submission wizard does NOT include IAP attachment (per Apple's official 2025 release notes: *"In-App Purchases and subscriptions aren't eligible to be included as items in a submission since they have a separate submission process."*). So the section MUST appear on the version page — and it doesn't.

### Fixes in Build 47

**Apple Sign-In defensive logging** — `components/auth/SocialLoginButtons.tsx` (handleAppleSignIn, lines 56-105). Build 47 is a diagnostic build — we cannot reproduce iOS 26.4.1 / iPhone 17 Pro Max locally. Four targeted changes:

- Structured credential log after `signInAsync()`: `[AppleSignIn] credential received { hasIdentityToken, identityTokenLength, hasUser, hasEmail, hasFullName, hasGivenName, hasFamilyName }`
- Replaced single `!credential.identityToken` check with two thrown errors: `APPLE_SIGNIN_NO_TOKEN` (empty/whitespace) and `APPLE_SIGNIN_MALFORMED_TOKEN` (not 3 dot-separated parts)
- Structured Supabase error log on `signInWithIdToken` failure: `[AppleSignIn] supabase.signInWithIdToken failed { message, status, name }`
- Wrapped `supabase.auth.updateUser({ data: { full_name } })` in try/catch — failure is now non-fatal (logged as `[AppleSignIn] updateUser failed (non-fatal)`). Apple has already authenticated the user; metadata write is secondary and shouldn't crash the sign-in.

**Talk quota stale-JWT fix** — `app/(tabs)/talk.tsx` line 347. Added `await supabase.auth.refreshSession()` immediately before `await checkTalkQuota()`. Plus added `import { supabase } from "@/services/supabase/client"`.

Why: `supabase.functions.invoke()` does NOT auto-refresh the JWT before sending. After idle, the cached token may be expired → 401 from `getUser()` in the function. Refreshing first guarantees a fresh JWT. Risk: zero (refreshSession is a no-op when token is fresh).

### What we INTENTIONALLY did NOT do (these are wrong / risky)

- **Did NOT add `com.apple.developer.in-app-purchase` to entitlements**. StoreKit requires zero entitlements; build 44 was approved without it. Adding it could trigger a provisioning profile mismatch.
- **Did NOT refactor `services/iap/client.ts`** — already correct per react-native-iap v15 docs.
- **Did NOT refactor `app/profile/subscription.tsx`** — build 46 hardening (error banner + disabled Subscribe) is the desired UX.
- **Did NOT add a `.storekit` configuration file** — sandbox tester is the standard path for our flow.
- **Did NOT introduce Sentry/Crashlytics** — `console.log` is sufficient diagnostic for build 47.
- **Did NOT modify the `check-talk-quota` Supabase function** — surgical client-side fix avoids regression risk.

### THE BLOCKER — Apple-side IAP attachment bug

**Problem**: The "In-App Purchases and Subscriptions" section is missing from the v1.0.2 version page. Without it, products cannot be attached, and Apple Review cannot find them. The new "Add for Review" wizard does NOT include IAPs.

**Fix path**: Contact Apple Developer Support. URL: https://developer.apple.com/contact/topic/select → "App Store Connect" → "App Submission". Subject: `In-App Purchases and Subscriptions section missing on version 1.0.2 build 46 — bug 820936`. Body template is in the recovery memory file at `~/.claude/projects/-Users-niravramani-Desktop-Projects-sophie/memory/project_build_47_recovery.md`.

Wait for response (24-72h). Once Apple force-attaches the products OR the section reappears, archive + upload build 47.

### App Store Connect verification checklist (do this when browser access is available)

1. **Business → Agreements**: Paid Apps row = **Active**. Tax forms Active. Bank account Active.
2. **Apps → Speak With Sophie → Monetization → Subscriptions → Sophie Premium group** (ID 22034127):
   - English (U.S.) localization with display name `Sophie Premium`
   - **Investigate the apparent duplicate "Sophie Premium Monthly" at Level 1** — click into both rows; confirm whether they're separate products or a UI rendering artifact
3. **Each subscription product**: Status = **Ready to Submit** (not "Missing Metadata"). English localization + description present. Review screenshot uploaded. Price tier set.
4. **v1.0.2 version page**: Re-confirm no "In-App Purchases and Subscriptions" section anywhere (scroll fully). Take a screenshot for the Developer Support ticket.
5. **App Information → General Information**: Apple App ID = `6759192122`.

### Build 47 ship checklist

1. [ ] Apple Developer Support ticket filed (Forum 820936 reference)
2. [ ] Apple force-attaches products OR section reappears
3. [ ] App Store Connect verification (5 items above) all green
4. [ ] Pro entitlement granted to `armanmishra1000@gmail.com` in production DB:
   ```sql
   INSERT INTO public.apple_subscriptions (
     user_id, original_transaction_id, product_id, state, expires_date, environment
   ) VALUES (
     (SELECT id FROM auth.users WHERE email = 'armanmishra1000@gmail.com'),
     'manual_grant_appreview',
     'ai.speakwithsophie.app.premium.semiannual',
     'active',
     '2027-04-20T00:00:00Z',
     'Sandbox'
   );
   ```
5. [ ] `app.config.ts` buildNumber 47 (already done)
6. [ ] `npx expo prebuild --platform ios --clean` (already done)
7. [ ] Xcode → Archive → Distribute → App Store Connect
8. [ ] Re-attach both IAP products to build 47 submission (per Apple Support resolution)
9. [ ] Reply in App Store Connect rejection thread acknowledging both 2.1(a) and 2.1(b)
10. [ ] Submit for Review

## Key Files

- **`app.config.ts`** — Contains `bundleIdentifier`, `buildNumber`, `version`, and `ITSAppUsesNonExemptEncryption`
- **`ios/`** — Generated by `npx expo prebuild`. Never manually edit. Always regenerate.

## Config Details (app.config.ts)

The iOS section should always include:

```typescript
ios: {
  supportsTablet: true,
  bundleIdentifier: "ai.speakwithsophie.app",
  buildNumber: "X",  // INCREMENT this for every new TestFlight upload
  infoPlist: {
    NSMicrophoneUsageDescription: "Allow Fluent-AI to use the microphone for voice conversations.",
    ITSAppUsesNonExemptEncryption: false,  // Avoids export compliance popup
  },
},
```

## How to Upload a New Build to TestFlight

Every time you make changes and want to test on your iPhone via TestFlight:

### 1. Increment `buildNumber` in `app.config.ts`

Each TestFlight upload MUST have a unique build number. Increment it:
- "1" → "2" → "3" → "4" ...

The `version` (e.g., "1.0.0") only needs to change for new App Store releases, not for TestFlight builds.

### 2. Regenerate iOS folder

```bash
npx expo prebuild --platform ios --clean
```

### 3. Open in Xcode

```bash
xed ios
```

### 4. Verify signing

- Select the **sophie** target
- Go to **Signing & Capabilities** tab
- Ensure **"Automatically manage signing"** is checked
- Team should be **Apexture Private Limited**
- No red errors should appear

### 5. Archive

- Set device target to **"Any iOS Device (arm64)"** or your connected iPhone (top toolbar)
- Menu: **Product > Archive**
- Wait 5-15 minutes for build to complete

### 6. Upload

- The **Organizer** window opens automatically after archive
- Click **"Distribute App"**
- Select **"App Store Connect"** → Click **"Distribute"**
- Wait for upload to complete
- Ignore "Upload Symbols Failed" warnings — they are harmless

### 7. Wait for processing

- Go to https://appstoreconnect.apple.com → Your App → **TestFlight** tab
- Build takes 5-15 minutes to process
- Once status shows **"Ready to Submit"** / **"Complete"**, the new build auto-appears in TestFlight on your iPhone

## Quick Command Reference

```bash
# Full rebuild + open Xcode workflow
npx expo prebuild --platform ios --clean && xed ios
```

Then in Xcode: **Product > Archive > Distribute App > App Store Connect > Distribute**

## Xcode Settings (already configured, but for reference)

| Setting | Value |
|---------|-------|
| Scheme Build Configuration | Release |
| Team | Apexture Private Limited |
| Signing | Automatic |
| Signing Certificate | Apple Development: Mitesh Paghdal |

## Versioning Strategy

| Field | When to Change | Example |
|-------|---------------|---------|
| `version` | New App Store release | "1.0.0" → "1.1.0" → "2.0.0" |
| `buildNumber` | Every TestFlight upload | "1" → "2" → "3" → "4" ... |

- Multiple builds can share the same `version` (e.g., version 1.0.0 with builds 1, 2, 3...)
- When submitting to the App Store, pick the best build from TestFlight
- `buildNumber` must ALWAYS increase (never reuse a number)

## Publishing to App Store (When Ready)

1. Go to App Store Connect → Speak With Sophie → **Distribution** tab
2. Fill in required metadata:
   - App description, keywords, categories
   - Screenshots (required: 6.7" and 6.5" iPhone sizes minimum)
   - Privacy policy URL (required)
   - App rating questionnaire
3. Select the build from TestFlight
4. Click **"Submit for Review"**
5. Apple reviews in 24-48 hours typically

## Important Notes / Gotchas

1. **Bundle ID is permanent** — `ai.speakwithsophie.app` cannot be changed after the first upload. A new bundle ID = a new app.
2. **"Sign in with Apple"** — If the app has login/signup, Apple REQUIRES "Sign in with Apple" as an option. Common rejection reason.
3. **Third-party AI disclosure** — Apple requires explicit user consent before sending data to third-party AI providers (Google Gemini). The `AIConsentModal` component handles this.
4. **Privacy Policy** — Required for App Store submission. Host somewhere publicly accessible.
4. **Screenshots** — Required for App Store. Take on simulator for each required device size.
5. **Never manually edit `ios/` folder** — Always use `npx expo prebuild --platform ios --clean` to regenerate.
6. **Xcode Cloud popup** — If it appears, click "Don't Ask Again". We do local builds only.
7. **Old bundle ID** — The app was originally `com.fluentai.sophie` but that was taken on Apple's system. Changed to `ai.speakwithsophie.app`.
8. **Android bundle** — Still uses `com.fluentai.sophie` in app.config.ts. Update if/when publishing to Google Play.

## Troubleshooting

### "Failed Registering Bundle Identifier"
- Bundle ID is taken. Must use a unique one. Current: `ai.speakwithsophie.app`

### "Device not registered"
- Connect iPhone via USB → Click "Register Device" in Xcode signing

### "Communication with Apple failed"
- Connect iPhone via USB cable (not wireless)

### "Upload Symbols Failed" warnings
- Harmless. Just about dSYM debug symbols. Click Done and move on.

### Build not appearing in TestFlight
- Wait 5-15 minutes for Apple to process
- Check "Build Uploads" section in TestFlight tab for status
