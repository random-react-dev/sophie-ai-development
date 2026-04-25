# Google Play Billing Setup Guide — Sophie (Android)

This guide walks you through EVERY click needed on the Google side so our developers can launch the Speak With Sophie subscription on Android. Expect ~2–3 hours of hands-on work, plus multi-day waiting periods for payments-profile verification and bank validation. Some steps require business/tax/banking info — gather those before you start.

**App details (keep this handy)**

- App Store name: **Speak With Sophie**
- Android Package name: `ai.speakwithsophie.app`
- Developer account: **Apexture Private Limited** (organization account)
- Domain: speakwithsophie.ai
- Subscription name (user-facing): **Sophie Premium**

**Product identifiers the developer needs** (final values confirmed by dev before you create anything — see Step 0):

- Subscription container ID: `ai.speakwithsophie.app.premium`
- Monthly base plan ID: `premium-monthly` — ~$7.99 / month
- Semi-annual base plan ID: `premium-semiannual` — ~$11.99 / 6 months
- Intro offer on monthly: **`free-trial-7d`** (7-day free trial)

> **Different from Apple!** On Apple we had **two separate subscription products**. On Google you create **ONE subscription container** ("Sophie Premium") with **TWO base plans** inside it (monthly + semi-annual) and **ONE offer** attached to the monthly base plan (the 7-day free trial). This three-tier model is Google-specific. Follow the steps below in order — do not try to recreate the Apple structure.

---

## Step 0 — Confirm final product IDs with the developer (5 minutes)

Product IDs in Google Play are **permanent**. You cannot rename, delete, or reuse them after creation. Before touching Play Console, ask the developer to confirm the IDs in the table above are still exactly what the Android client will query. If the developer changes them later, every existing subscription still references the old IDs forever.

- [ ] Developer confirmed subscription ID: `ai.speakwithsophie.app.premium`
- [ ] Developer confirmed monthly base plan ID: `premium-monthly`
- [ ] Developer confirmed semi-annual base plan ID: `premium-semiannual`
- [ ] Developer confirmed offer ID: `free-trial-7d`

Only proceed once these are locked.

---

## Before you start — what you need on hand

- [ ] Google Play Console account with **Owner** or **Admin** role for Apexture Private Limited. Check under **Users and permissions** (gear icon, bottom-left). If you only have Marketing/Release manager role, ask the Owner to upgrade you or perform these steps themselves.
- [ ] Company legal name, registered business address, and phone (Apexture Private Limited)
- [ ] Bank account details for revenue deposit (IBAN/SWIFT/local routing numbers). Payouts from Google Play to India arrive in USD, not INR.
- [ ] Business registration documents for India — typically one of: Certificate of Incorporation, GST Certificate, CIN/Udyam document.
- [ ] Government photo ID of an authorized signer (director/partner) — Passport, Aadhaar, PAN, or driving licence.
- [ ] A Google account you will use as the Cloud project owner (can be the same email as the Play Console Owner). You will log into `console.cloud.google.com` with it in Step 2.
- [ ] At least one Gmail account you can use as a **license tester** (safely test purchases without paying real money — Step 10). The Owner account is already a license tester by default.
- [ ] About 2–3 hours of uninterrupted time, plus patience for payments profile review (a few business days) and bank verification (up to 3 days).

**Values you will collect and send to the developer at the end:**

- [ ] Google Cloud **Project ID** (Step 2)
- [ ] Service account **email address** (Step 3)
- [ ] Service account **JSON key file** (Step 3)
- [ ] Pub/Sub **topic full name** (Step 9) — only if developer asks for it
- [ ] Pub/Sub **push subscription name** (Step 9) — only if developer asks for it
- [ ] License tester email + notes (Step 10)
- [ ] Confirmation that all Step 5–8 products/base plans/offers are **Active**

---

## Step 1 — Payments profile, tax, banking

Without a verified payments profile, the **Monetize with Play** section of Play Console does not accept any paid products. Before anything else, create and verify the payments profile.

**Where to go:** Log in to <https://play.google.com/console>. On the left sidebar, look for **Setup** → **Payments profile**. (Older UI may show this as **Monetize with Play → Monetization setup**.)

### 1a. Create the payments profile

- [ ] Click **Create payments profile**.
- [ ] **Account type:** choose **Organization** (not Individual). This is **immutable** — cannot be changed later.
- [ ] **Country/region:** **India**. This is also **immutable**. If the wrong country is selected, the only fix is creating a new profile and re-linking.
- [ ] **Legal business name:** type exactly as registered — `Apexture Private Limited`.
- [ ] **Business address:** the registered office address (no PO boxes).
- [ ] **Primary contact:** authorized director/partner name, email, phone.
- [ ] **Public merchant name:** what appears on buyers' credit card statements (e.g., `Apexture Sophie`).
- [ ] **Business website:** `speakwithsophie.ai`.
- [ ] **Customer support email:** a real inbox (users will see this).
- [ ] Click **Submit**.

### 1b. Upload business verification documents

After submission, Play Console shows a checklist of verification tasks. For an India-based organization, you will typically be asked to provide:

- [ ] One business registration document — Certificate of Incorporation, GST Certificate, CIN, or Udyam Registration.
- [ ] Government photo ID of the authorized signer (director/partner).
- [ ] Any additional documents Play Console requests per India regulations. India's payments-compliance rules change periodically; **follow whatever the Play Console UI asks for at the time**. If you see a step mentioning "BillDesk" or cross-border payments verification, follow the in-console instructions or contact Play Console support via the **Help** icon — do not skip.

Verification typically takes a few business days.

### 1c. Add bank account for payouts

- [ ] Still in **Setup → Payments profile**, scroll to **Bank accounts**. Click **Add bank account**.
- [ ] Choose the country where the account is held (India).
- [ ] Enter: bank name, account holder name (must match the legal entity name), account number, IFSC/SWIFT code, branch address.
- [ ] Click **Save**.
- [ ] Google sends a small **test deposit** to the account within 2–3 business days. You must confirm the amount back in the Play Console to verify ownership.

**Watch out:** Until the payments profile shows **Active** status AND the bank account shows **Verified**, you cannot Activate any subscription product. Come back to this page daily until both are green.

### 1d. Tax information

- [ ] Play Console → **Setup → Payments profile → Tax info**. Follow the country-specific questionnaire.
- [ ] For Apexture (India entity) you will fill out a **W-8BEN-E equivalent** for US tax withholding, plus India tax info (PAN, GST if registered).
- [ ] The **Foreign TIN** field should be the company's **PAN** — do not leave blank.
- [ ] Submit.

**Done check:** After 2–5 business days, the payments profile page should show all sections green: profile Active, bank Verified, tax forms Active. If anything is pending or red, click into it and fix before proceeding.

---

## Step 2 — Link a Google Cloud project to Play Console

Google Play's server-side tooling (purchase verification, real-time notifications) lives on Google Cloud. You need to create a Cloud project and link it to the Play Console app.

### 2a. Create the Cloud project

- [ ] Open <https://console.cloud.google.com> and log in with the **same Google account** that owns the Play Console.
- [ ] At the top-left, click the project picker (says "Select a project" or your existing project name) → **New Project**.
- [ ] **Project name:** `speakwithsophie-play` (or similar descriptive name).
- [ ] **Organization:** leave as default (usually "No organization" unless you have a Google Workspace org).
- [ ] Click **Create**. Wait ~20 seconds for the project to provision.
- [ ] **Copy the Project ID** from the dashboard (looks like `speakwithsophie-play-481234`). The ID is different from the Name — the ID is what's used in URLs and is permanent. **Write this down** — you'll paste it into Play Console and send it to the developer.

> **No billing account needed** for our usage. Google Cloud Pub/Sub has a generous free tier (10 GiB/month outbound traffic) and Sophie's notification volume is far below that.

### 2b. Enable two required APIs in the Cloud project

In Cloud Console:

- [ ] Left nav (hamburger ☰) → **APIs & Services** → **Library**.
- [ ] Search `Google Play Android Developer API` → click the result → **Enable**. Wait ~15 seconds.
- [ ] Click **Library** again. Search `Cloud Pub/Sub API` → click → **Enable**. Wait ~15 seconds.

### 2c. Link the Cloud project to Play Console

- [ ] Open Play Console → **Setup → API access** (left sidebar, under the gear/Setup section).
- [ ] On first visit you'll see a card titled **"Link existing Google Cloud project"** or **"Create new Google Cloud project"**.
- [ ] Click **Link existing Google Cloud project** → pick the project from Step 2a → **Save and Link**.
- [ ] Accept any API Terms of Service prompts.

---

## Step 3 — Create a Service Account (for server-side purchase verification)

The developer's backend needs credentials to call Google's **Android Publisher API** to verify each purchase. You create these credentials as a Google Cloud **service account** with a JSON key file.

### 3a. Create the service account

- [ ] Still in Play Console → **Setup → API access** → scroll to **Service accounts** → click **Create new service account**.
- [ ] A blue link pops open Google Cloud Console's **IAM & Admin → Service Accounts** page, already filtered to your linked project.
- [ ] Click **+ Create service account** at the top.
- [ ] **Service account name:** `play-api-verifier` (display name).
- [ ] **Service account ID:** leave the auto-generated value (becomes the email: `play-api-verifier@<project-id>.iam.gserviceaccount.com`).
- [ ] **Description:** "Verifies Sophie Play Billing purchases server-side."
- [ ] Click **Create and continue**.
- [ ] **Grant this service account access to project:** **SKIP — leave empty** — click **Continue**. (We'll grant Play-side permissions in Step 3c, not via Cloud IAM.)
- [ ] **Grant users access:** leave empty → **Done**.

### 3b. Generate a JSON key file

- [ ] Back on the Service Accounts list, click the new `play-api-verifier@...` row.
- [ ] Click the **Keys** tab at the top.
- [ ] Click **Add key → Create new key**.
- [ ] Key type: **JSON**. Click **Create**.
- [ ] Your browser downloads a file named something like `speakwithsophie-play-481234-abc1234.json`. **Keep this file — you cannot download it again.**

**IRREVERSIBLE — read carefully:**
- The JSON key file contains a **private cryptographic key**. Anyone who obtains it can call the Android Publisher API as Apexture.
- Store it in a password manager (1Password, Bitwarden, etc.). Do NOT email it in plaintext. Do NOT commit it to Git. Do NOT paste it into Slack without a disappearing message.
- If the file leaks, go back to the **Keys** tab in Cloud Console and click **Delete** on the old key, then generate a new one (Step 3b). Send the developer the new key and tell them to rotate.

### 3c. Grant the service account Play Console permissions (required!)

- [ ] Go back to Play Console → **Setup → API access**. The new service account now appears in the list with status "Not yet invited" or "No permissions".
- [ ] Click **Grant access** or **Manage permissions** next to the service account.
- [ ] On the **Account permissions** tab, check ONLY:
  - [ ] **View financial data, orders, and cancellation survey responses** (this implicitly grants access to the Purchases API — the only permission our backend needs to verify a subscription)
- [ ] **Do NOT** check "Manage orders and subscriptions" — we don't need that. Principle of least privilege.
- [ ] On the **App permissions** tab (recommended):
  - [ ] Click **Add app** → select **Speak With Sophie** only. This scopes the service account to our app only — if Apexture adds other apps to Play Console later, this account cannot see their finances.
- [ ] Click **Invite user** → **Send invitation**.

**Propagation gotcha:** Permissions take up to **24 hours** to propagate to the Android Publisher API. If the developer's first verification call returns "401 Unauthorized" or "permission denied" within the first day, this is why — it's not a bug, just wait.

---

## Step 4 — Find your Package Name and confirm the app is set up

- [ ] Play Console → **All apps** → click **Speak With Sophie**.
- [ ] In the left sidebar, go to **Dashboard**. At the top of the page the **Package name** is displayed — confirm it reads exactly `ai.speakwithsophie.app`.
- [ ] If the app doesn't exist yet in Play Console, create it first: Play Console home → **Create app** → App name `Speak With Sophie`, Default language `English (United States)`, App type `App`, Free/Paid `Free`. Accept declarations → **Create app**.

The developer will have already uploaded at least one internal-testing build — you do not need to upload anything in this step, just confirm the app record exists.

---

## Step 5 — Create the Subscription (container for Sophie Premium)

Remember: on Google Play, a subscription is a **container**. It holds one or more **base plans** (actual purchasable pricing). You create the container here; base plans come next.

**Where to go:** Play Console → **Speak With Sophie** → in the left sidebar under **Monetize with Play**, click **Products → Subscriptions**.

- [ ] If you see a banner saying "Set up a payments profile to use this feature" → go back and finish Step 1.
- [ ] Click **Create subscription**.
- [ ] **Product ID:** type exactly `ai.speakwithsophie.app.premium` — lowercase, no spaces. **Cannot be changed later.** Double-check the dots and spelling.
- [ ] **Name:** `Sophie Premium` (this is user-visible — shown on receipts and in Play's Subscription Center).
- [ ] Click **Create**.

### 5a. Add a description (required before activation)

- [ ] On the new subscription's page, find the **Description** field.
- [ ] Paste: `Unlimited voice conversations with Sophie, your AI language tutor. Choose monthly or 6-month billing. Cancel anytime.`
- [ ] Click **Save**.

### 5b. Benefits (recommended — required in some regions)

- [ ] Scroll to **Benefits**. Click **Add benefit**.
- [ ] Benefit 1: `Unlimited voice conversations with Sophie`
- [ ] Benefit 2: `All 20 supported languages`
- [ ] Benefit 3: `Priority response quality`
- [ ] Click **Save**.

### 5c. Tax and compliance

- [ ] **Tax category:** the default "Services" is correct for a digital AI subscription.
- [ ] Leave other compliance toggles at defaults unless the developer asks otherwise.

---

## Step 6 — Create the Monthly Base Plan

Still inside the **Sophie Premium** subscription page:

- [ ] Scroll to **Base plans and offers**. Click **Add base plan**.
- [ ] **Base plan ID:** type exactly `premium-monthly` — lowercase, **hyphens only (no dots)**. **Cannot be changed.**
- [ ] **Type:** **Auto-renewing**. (Do NOT choose Prepaid or Installments — both are wrong for Sophie.)
- [ ] **Billing period:** **1 month**.
- [ ] **Grace period:** **3 days** (Google's recommended default — gives users 3 days after a failed charge to update payment before the sub enters account hold).
- [ ] **Account hold:** **30 days** (default — after grace period, Google holds the sub for 30 days before cancelling).
- [ ] **Resubscribe:** **Allow**.
- [ ] Click **Save**.

### 6a. Set the price

- [ ] On the base plan page, scroll to **Prices** → click **Set prices** or **Add country/region**.
- [ ] Click **Add countries/regions** → **Select all** (or pick your launch list).
- [ ] **Base price:** enter `USD 7.99`.
- [ ] Click **Apply prices** or **Auto-convert prices**. Google generates localized prices for every country using current FX rates (e.g., ~₹669 in India, ~€7.49 in EU).
- [ ] Review the table briefly. Don't tweak individual countries unless the dev asks.
- [ ] Click **Save**.

### 6b. Tags (optional but useful)

- [ ] Add tag: `plan-monthly` (helps the client code identify this base plan among multiple).
- [ ] Save.

---

## Step 7 — Create the Semi-Annual Base Plan

Repeat Step 6 with these values:

- [ ] **Add base plan** (still on the Sophie Premium subscription page).
- [ ] **Base plan ID:** `premium-semiannual`
- [ ] **Type:** Auto-renewing
- [ ] **Billing period:** **6 months**
- [ ] **Grace period:** 3 days
- [ ] **Account hold:** 30 days
- [ ] **Resubscribe:** Allow
- [ ] **Base price:** `USD 11.99`, auto-convert to all countries
- [ ] **Tag:** `plan-semiannual`
- [ ] Save.

**Do NOT add a free-trial offer to this base plan.** Google's rules (like Apple's) allow only one free-trial offer per user per subscription — we want the trial only on the monthly plan so users who pick semi-annual commit to a paid purchase.

---

## Step 8 — Add the 7-Day Free Trial Offer (on the monthly base plan)

Go back to the **`premium-monthly`** base plan (Sophie Premium → `premium-monthly`).

- [ ] On the base plan page, find **Offers** section. Click **Create offer**.
- [ ] **Offer ID:** `free-trial-7d` — lowercase, hyphens only. **Cannot be changed.**
- [ ] **Eligibility criteria:** **New customer acquisition** — select the sub-rule "The user has never subscribed to this app." (This matches Apple's "one trial per user per app" rule.)
- [ ] **Regions/availability:** click **Select all regions** (we want the trial globally).
- [ ] Click **Next** → **Add phase**.

### 8a. Configure the trial phase

- [ ] Phase 1 type: **Free trial**.
- [ ] Duration: **7 days**.
- [ ] Click **Save**.
- [ ] This is the only phase. After the trial, users automatically roll into the base plan price ($7.99/month) — no extra phase needed.
- [ ] Back on the offer page, click **Save** again at the top to finalize.

**IRREVERSIBLE caveat:** Offer IDs cannot be changed or reused. If you fat-finger the ID, you have to deactivate the old offer and create a new one with a different ID — the dev will then need to update the client code.

---

## Step 9 — Activate everything

Nothing from Step 5–8 is purchasable yet. Each level has its own Active/Inactive toggle, and you need to activate all of them.

### 9a. Activate the offers and base plans

- [ ] Go to **Sophie Premium → `premium-monthly`** → scroll to the offer `free-trial-7d` → click **Activate**. Status turns green/Active.
- [ ] Go to **Sophie Premium → `premium-monthly`** → at the top, click **Activate base plan**. Status turns Active.
- [ ] Go to **Sophie Premium → `premium-semiannual`** → click **Activate base plan**. Status turns Active.

### 9b. Activate the subscription

- [ ] Back on **Subscriptions** page, find the `Sophie Premium` row. The Status column should now say **Active** (it auto-activates once at least one base plan is active).
- [ ] If it says Inactive, click into the subscription → **Activate**.

**Verify before moving on:**
- [ ] Subscription `Sophie Premium` → Active
- [ ] Base plan `premium-monthly` → Active
- [ ] Base plan `premium-semiannual` → Active
- [ ] Offer `free-trial-7d` → Active

If anything is not Active, the developer's `fetchProducts` call on the phone will return empty — users see "Temporarily Unavailable" and the Subscribe button is disabled (same kind of failure we just hit on iOS build 45). Double-check this page.

---

## Step 10 — Real-Time Developer Notifications (RTDN)

**This step can be deferred** — only do it when the developer confirms the backend webhook endpoint is deployed. If they haven't yet, skip to Step 11.

### 10a. Create the Pub/Sub topic

- [ ] Open <https://console.cloud.google.com> → make sure the project picker shows **speakwithsophie-play** from Step 2.
- [ ] Left nav (☰) → scroll → **Pub/Sub → Topics** (or direct URL: <https://console.cloud.google.com/cloudpubsub/topic/list>).
- [ ] Click **+ Create topic**.
- [ ] **Topic ID:** `play-rtdn-sophie`.
- [ ] **Add a default subscription:** **uncheck** — we'll create a push subscription manually.
- [ ] Leave everything else default. Click **Create**.
- [ ] On the topic detail page, at the top, copy the **full topic name** shown — it looks like `projects/speakwithsophie-play-481234/topics/play-rtdn-sophie`. **You need this string verbatim.**

### 10b. Grant Google Play permission to publish to the topic

This is the single most forgotten step — skip it and RTDN silently delivers nothing.

- [ ] On the topic detail page, click **Permissions** (or the info panel, then **Permissions**).
- [ ] Click **Add principal**.
- [ ] **New principals:** paste exactly `google-play-developer-notifications@system.gserviceaccount.com`
- [ ] **Role:** `Pub/Sub Publisher`
- [ ] Click **Save**.

### 10c. Configure RTDN in Play Console

- [ ] Open Play Console → **Speak With Sophie** → **Monetize with Play → Monetization setup** (sidebar).
- [ ] Find **Real-time developer notifications** section.
- [ ] Tick **Enable real-time notifications**.
- [ ] **Topic name:** paste the full topic name from Step 10a (`projects/.../topics/play-rtdn-sophie`).
- [ ] **Notification types:** choose **Subscriptions and all voided purchases** (Sophie only sells subscriptions).
- [ ] Click **Send test notification**. A green success banner = Play successfully published a test event into your topic.
- [ ] Click **Save changes**.

### 10d. Create a push subscription pointing at the developer's webhook

The developer will give you one URL like `https://upfivcrszqvbkrchevlq.supabase.co/functions/v1/play-webhook`.

- [ ] Cloud Console → **Pub/Sub → Subscriptions** → **+ Create subscription**.
- [ ] **Subscription ID:** `play-rtdn-sophie-push`.
- [ ] **Topic:** select `projects/.../topics/play-rtdn-sophie`.
- [ ] **Delivery type:** **Push**.
- [ ] **Endpoint URL:** paste the developer's webhook URL.
- [ ] **Enable authentication:** **check the box**. Select a service account — either the `play-api-verifier` from Step 3 or create a new one called `pubsub-push-invoker`. If Cloud Console prompts you to grant a **Token Creator** role, click **Grant** (required for push auth to work).
- [ ] **Ack deadline:** leave default (10 seconds).
- [ ] **Retry policy:** **Retry after exponential backoff**, default min/max.
- [ ] Click **Create**.
- [ ] Send the push subscription name (`projects/.../subscriptions/play-rtdn-sophie-push`) to the developer.

---

## Step 11 — Add a License Tester (for testing purchases without real charges)

License testers can complete the purchase flow and see "This is a test purchase" dialogs — no real money is charged, and subscriptions renew on an accelerated timeline (e.g., 1 month → 5 min) so testing is fast.

**Where to go:** Play Console home (not inside the Sophie app) → top-right gear icon → **Settings → Developer account → Account details**. Scroll down to **License testing**.

- [ ] Click **Add email addresses** (or **Edit** if a list exists).
- [ ] Enter the Gmail address(es) of anyone who needs to test IAP — yourself, the developer, QA testers.
- [ ] License test response: leave at default **RESPOND_NORMALLY**.
- [ ] Click **Save changes**.

**To actually test purchases**, the tester must ALSO install the app from a testing track (Internal Testing is easiest):
- [ ] Go back to the Sophie app → **Test and release → Testing → Internal testing**.
- [ ] Ensure a release is rolled out.
- [ ] **Testers** tab → add the same Gmail(s) to an email list.
- [ ] Copy the **"Join on the web"** opt-in URL → send to the tester.
- [ ] Tester opens URL on their phone (signed into the right Google account) → **Become a tester** → installs app from Play Store.

**Watch out:**
- Being a license tester alone doesn't make purchases free — they must also install via the testing track.
- First-time internal test propagation can take up to 48 hours; after that, minutes.
- If the tester sees real prices instead of "test purchase" dialogs, their Google account is missing from the license-tester list or they installed from outside the Play Store.

---

## Step 12 — Hand off to the developer

Copy this block, fill it in, and send it to the developer over a secure channel (1Password share, Signal, or encrypted message — NOT email-in-plaintext for the JSON key).

```
Google Play IAP credentials for Speak With Sophie
-------------------------------------------------
Google Cloud Project ID:      __________________________
Service account email:        __________________________@__________________________.iam.gserviceaccount.com
Service account JSON key:     [attached securely — do NOT paste contents here]
Package name:                 ai.speakwithsophie.app
Subscription container ID:    ai.speakwithsophie.app.premium
Base plan IDs:
  - premium-monthly   ($7.99/month, 7-day free trial offer `free-trial-7d`)
  - premium-semiannual ($11.99/6 months, no offer)
License tester email(s):      __________________________
(After backend deployed — Step 10 values)
Pub/Sub topic name:           projects/__________/topics/play-rtdn-sophie
Pub/Sub push subscription:    projects/__________/subscriptions/play-rtdn-sophie-push
```

- [ ] Google Cloud Project ID sent
- [ ] Service account email sent
- [ ] Service account JSON key sent (securely)
- [ ] License tester Gmail confirmed
- [ ] All three subscription products confirmed **Active** in Play Console
- [ ] (Later, once dev deploys webhook) RTDN topic + push subscription configured and sent

The developer will now build the Android client against your Product ID + base plan IDs, test locally against the license-tester account, and come back with the webhook URL for Step 10.

---

## Step 13 — (at submission time) Configure App Content + submit

Unlike Apple, Google **does not require you to "attach" products to a specific build** — any Active subscription is immediately available to any app version that queries it. But before your first production release you must still complete App Content declarations.

**Where to go:** Play Console → Speak With Sophie → **Policy and programs → App content**.

Complete each card (every card must be green before submission):

- [ ] **Privacy policy** — Enter `https://speakwithsophie.ai/privacy` (or your current live URL).
- [ ] **App access** — Add the demo account that App Review will use:
  - [ ] Click **All or some functionality is restricted** → **+ Add new instructions**.
  - [ ] Name: `Demo account for Google review`
  - [ ] Username: `appreview@speakwithsophie.ai` (same account used for Apple — already created in Supabase)
  - [ ] Password: (admin to paste)
  - [ ] Steps to access restricted content: `1. Sign in with the credentials above. 2. Navigate: Profile → Subscription. 3. Tap "Subscribe" on either Monthly or 6-Month plan.`
- [ ] **Ads** — No.
- [ ] **Content rating** — Complete the IARC questionnaire (AI tutor; no violence/sexual content; user interacts with AI; audio data collected). Expect rating: Everyone or Teen.
- [ ] **Target audience and content** — Age 18+ only.
- [ ] **News apps** — Not a news app.
- [ ] **COVID-19 contact tracing** — Not a contact-tracing app.
- [ ] **Data safety** — Declare:
  - [ ] Personal info (Name, Email, User IDs) — collected, for account management, encrypted in transit, user can request deletion.
  - [ ] Audio files (voice recordings) — collected AND shared with Google (Gemini API), for app functionality.
  - [ ] Purchase history — collected (for entitlement checks).
  - [ ] No advertising ID usage.
- [ ] **Government apps**, **Health**, **Financial features**, **Social features/UGC** — declare Not applicable.
- [ ] **Advertising ID** — No.

### 13a. Store listing fields (if not already done)

- [ ] Play Console → **Grow → Store presence → Main store listing**.
- [ ] App name, short description (80 char max), full description (4000 char max), app icon (512×512 PNG), feature graphic (1024×500 PNG), phone screenshots (2–8, 1080×1920).
- [ ] Category: Education.

### 13b. Submit for review

- [ ] **Test and release → Production → Create new release** → upload the AAB from the developer.
- [ ] Release notes: brief changelog.
- [ ] **Review release** → confirm subscriptions appear in the "In-app products" preview (they should — Active subscriptions are auto-included).
- [ ] **Start rollout to Production**.

Because Apexture is an **organization account**, Google does NOT require 14-day closed testing + 12 testers before Production — you can publish directly. Review typically takes 3–7 business days for new apps.

---

## Troubleshooting

**"I don't see the Subscriptions menu under Monetize with Play."**
- Go to **Setup → Payments profile**. Profile must be **Active**, bank **Verified**, tax forms **Active**. Any pending/red status hides monetization features.

**"I added a subscription but the Subscribe button on the device does nothing / shows 'Temporarily Unavailable'."**
- Check Step 9 activation list. Subscription, both base plans, AND the offer all need to be Active. Any one of them Inactive → client receives empty product list.
- Package name mismatch between AAB and Play Console → also returns empty products.
- Tester is not on the license-tester list → Play tries to charge real money, may reject if account has no card.

**"Send test notification" in RTDN fails with a permission error.**
- You skipped Step 10b. Go back and grant `google-play-developer-notifications@system.gserviceaccount.com` the `Pub/Sub Publisher` role on the topic.

**"Developer says the first `subscriptionsv2.get` API call returned 401."**
- Service account permissions need up to 24 hours to propagate. Wait.
- Verify Step 3c: the service account has **View financial data, orders, and cancellation survey responses** AND app access includes Sophie.

**"Bank account has been pending for over 3 days."**
- Confirm the test deposit amount was entered correctly in **Payments profile → Bank accounts → Confirm deposit**. If you entered wrong amounts 3× the account is locked — contact Play Console support.

**"Base plan price box won't let me save."**
- A base country price must be set first. Pick USD, set $7.99 or $11.99, then click "Apply prices to all countries" / "Auto-convert".

**"I can't delete a subscription/base plan/offer I created by mistake."**
- None of these can be deleted once created — only **deactivated**. For product IDs permanently: the ID is reserved forever. Create a new one with a fresh ID and tell the developer to switch. If the mistaken ID was `ai.speakwithsophie.app.premium`, use a fallback like `ai.speakwithsophie.app.premium2` — but confirm with dev first.

**"License tester sees real prices, not test prices."**
- License tester is not on the list, OR the app was installed outside Play Store, OR they're signed into a different Google account. Verify all three.

**"Subscription 'Sophie Premium' keeps showing 'Missing information'."**
- Open it and check: Description filled? Tax category set? At least one base plan Active? All three must be green before the subscription itself can be Activated.

---

## Glossary

- **Auto-renewable subscription** — a Play Billing product that charges the user automatically on each renewal until they cancel.
- **Base plan** — the actual purchasable pricing inside a subscription (billing period, renewal type, price). Google's equivalent of one Apple subscription product. A subscription must have at least one.
- **Offer** — a discount or free trial phase attached to a base plan. Optional.
- **Subscription (container)** — the top-level "product" holding one or more base plans. The thing users see as "Sophie Premium".
- **Billing Library** — the Android SDK the developer uses to query products and launch the purchase flow. Sophie uses version 7.x (via `react-native-iap`).
- **Package name** — the Android equivalent of Apple's Bundle ID (`ai.speakwithsophie.app`). Different from the subscription ID.
- **Product ID** — unique identifier for one subscription container, base plan, or offer. Maximum 40 chars, lowercase a–z, 0–9, underscores, periods. Base plan & offer IDs: hyphens instead of dots. All **immutable** once created.
- **Real-Time Developer Notifications (RTDN)** — Google's webhook system (delivered via Cloud Pub/Sub) for subscription lifecycle events (purchased, renewed, cancelled, refunded, etc.). Google's equivalent of Apple's App Store Server Notifications.
- **Pub/Sub** — Google Cloud's messaging service. The pipe that carries RTDN events from Google to our webhook.
- **Service account** — a non-human Google Cloud identity used by server code to call Google APIs. Has a JSON key file as credentials.
- **License tester** — a Google account authorized to make free test purchases during development.
- **Sandbox / Testing tracks** — Internal, Closed, Open testing. Google doesn't have a separate "sandbox" environment like Apple; real products + license testers serve the same purpose.
- **D-U-N-S number** — a 9-digit company identifier issued by Dun & Bradstreet. Apple requires it for organization accounts; Google Play generally does not require it (Google uses other business verification methods).
- **Play Console** — the web dashboard at `play.google.com/console`. Equivalent of App Store Connect.
- **Paid Apps Agreement (Apple term)** — no direct Google equivalent; the equivalent concept on Google is having an **Active payments profile** with verified banking and tax info.

---

## Further reading

Official Google documentation — bookmark these for reference:

1. <https://play.google.com/console/about/monetize/> — Play Console overview of monetization.
2. <https://support.google.com/googleplay/android-developer/answer/140504> — Create and manage subscriptions.
3. <https://support.google.com/googleplay/android-developer/answer/12154973> — Understanding Play subscriptions (three-tier model).
4. <https://developer.android.com/google/play/billing/subscriptions> — Subscription technical reference.
5. <https://developer.android.com/google/play/billing/rtdn-reference> — Real-Time Developer Notifications reference.
6. <https://support.google.com/googleplay/android-developer/answer/6062777> — License testing setup.
7. <https://developer.android.com/google/play/billing/test> — Play Billing testing guide (accelerated renewal timelines).
8. <https://support.google.com/googleplay/android-developer/answer/9845334> — Set up open/closed/internal tests.
9. <https://support.google.com/googleplay/android-developer/answer/9859348> — Prepare and roll out a release.
10. <https://support.google.com/googleplay/android-developer/answer/10787469> — Provide Data Safety section info.
11. <https://support.google.com/googleplay/android-developer/answer/15748846> — App Access / demo account requirements.
12. <https://support.google.com/googleplay/android-developer/answer/9900533> — Subscriptions policy (disclosure requirements, cancellation, free-trial rules).
13. <https://developers.google.com/android-publisher/getting_started> — Android Publisher API getting started.
14. <https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get> — The subscription verification API endpoint the developer will use.
15. <https://cloud.google.com/pubsub/docs/push> — Cloud Pub/Sub push subscriptions (webhook setup).
16. <https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions> — Pub/Sub push authentication.
17. <https://support.google.com/googleplay/android-developer/answer/7161426> — Create a Google payments profile.
18. <https://support.google.com/googleplay/android-developer/answer/14151465> — Account testing requirements (confirms organization accounts are exempt from the 14-day closed test rule).
