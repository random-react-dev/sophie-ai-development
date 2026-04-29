# Apple In-App Purchase Setup Guide — Sophie

Audience: the App Store Connect admin. Written for someone who has never set up subscriptions before.

This guide walks you through EVERY click needed on the Apple side so our developers can launch the Speak With Sophie subscription. Expect ~1–2 hours of hands-on work, plus up to 24–48 hours of waiting time for banking verification. Some steps require banking/tax info — gather those before you start.

**App details (keep this handy)**

- App Store name: **Speak With Sophie**
- iOS Bundle ID: `ai.speakwithsophie.app`
- Apple Team: **Apexture Private Limited**
- Monthly product ID: `ai.speakwithsophie.app.premium.monthly` — ~$7.99 / month
- Semi-annual product ID: `ai.speakwithsophie.app.premium.semiannual` — ~$11.99 / 6 months
- Intro offer: 7-day free trial on the monthly product

---

## Before you start — what you need on hand

- [ ] App Store Connect account with **Admin** or **Account Holder** role (check at https://appstoreconnect.apple.com → **Users and Access**). If you only have Developer/Marketing role, stop and ask the Account Holder to upgrade your role or perform these steps themselves.
- [ ] Company legal name, registered address, and phone (Apexture Private Limited)
- [ ] Bank account details for revenue deposit (IBAN/SWIFT or local routing + account numbers, bank name, branch address)
- [ ] Tax forms — which ones depends on your country. Apple will guide you through a questionnaire. Non-US companies typically need a **W-8BEN-E**; US companies need a **W-9**. Indian companies must include the company PAN as the Foreign TIN.
- [ ] A test email address you can use for a **Sandbox Apple ID** — this must NOT already be in use as a real Apple ID anywhere (e.g., use something like `sophie-sandbox-tester@yourdomain.com`)
- [ ] About 1–2 hours of uninterrupted time, plus patience for banking review

**Values you will collect and send to the developer at the end:**

- [ ] Apple **Issuer ID** (Step 2)
- [ ] **Key ID** for the In-App Purchase key (Step 2)
- [ ] The `.p8` key file contents (Step 2)
- [ ] Apple **App ID** (a 10-digit number, Step 3)
- [ ] Sandbox tester email + password (Step 9)

---

## Step 1 — Paid Applications Agreement (tax, banking)

Without this, the **Subscriptions** menu simply will not appear. Before anything else, sign the agreement and submit tax + banking info.

**Where to go:** Log in to https://appstoreconnect.apple.com. On the home page, click **Business** (older UI: **Agreements, Tax, and Banking**).

### 1a. Sign the Paid Applications Agreement

- [ ] On the **Agreements** tab, locate the row labeled **Paid Apps** (sometimes labeled **Paid Applications**).
- [ ] If the Status is **New** or **Request**, click **View and Agree to Terms**.
- [ ] Read the agreement. Tick the box "I have read and agree to these terms."
- [ ] Click **Agree**.
- [ ] Refresh the page. The Status should now read **Active** or show "Master Agreement: Active" plus a pending requirement for Tax Forms and Banking.

**Irreversible?** No — you can request termination later, but termination would disable all paid sales. Once signed, keep it signed.

### 1b. Enter tax information

- [ ] On the **Agreements** tab, scroll to **Tax Forms**. Click **Set Up** or **Complete Tax Forms**.
- [ ] Apple will show a country-specific questionnaire. Answer honestly — it branches into the correct form (W-9 for US entities, W-8BEN-E for non-US companies, W-8BEN for non-US individuals).
- [ ] For **Apexture Private Limited** (India-based company) the form will be **W-8BEN-E**. You will need:
  - Company legal name, country of incorporation (India), permanent address
  - US TIN (leave blank if you don't have one)
  - **Foreign TIN = the company's PAN** — do not leave this blank
  - Tax treaty article claim (India–US treaty)
  - Signature of a Director/Partner/authorized signer
- [ ] Submit the form. Status should change to **Active** within a few minutes.
- [ ] Apple may also require a local tax form (e.g., GST info, Japan JCT, Canada GST/HST). Complete every form the UI asks for — each has its own row and its own **Set Up** button.

**Watch out:** A rejected tax form blocks banking and blocks subscription creation. If a form is rejected, Apple shows the reason at the top of the tax form page. Fix and resubmit.

### 1c. Enter banking information

- [ ] On the **Agreements** tab, find **Bank Accounts**. Click **Add Bank Account**.
- [ ] Choose the country where the account is held, then enter:
  - Bank name, branch name, branch address
  - Account holder name (must match the legal entity name on the Paid Apps Agreement)
  - Account number and routing info (IBAN / SWIFT / ABA — whichever the country uses)
- [ ] Click **Save**. Apple may show a confirmation screen; click **Confirm**.
- [ ] **You will wait here.** Bank account changes require approval by the Account Holder, and processing takes up to **24 hours** after approval. If it is not approved within 30 days, the change is discarded.

**Costs money?** No fee to set up. Apple's commission (15% or 30%) is taken from each sale automatically.

**Done check:** After a day, the **Agreements** tab should show **Paid Apps: Active** with tax forms Active and a valid bank account. If any row shows yellow or "Pending", do not move on — contact Apple Developer support.

---

## Step 2 — Create an In-App Purchase Key

The developer needs three pieces to talk to Apple's IAP servers: an **Issuer ID**, a **Key ID**, and a `.p8` key file.

**Where to go:** App Store Connect home → **Users and Access** (top-right or in the user menu).

- [ ] Click **Users and Access**.
- [ ] Click the **Integrations** tab at the top.
- [ ] In the left sidebar under the heading **Keys**, click **In-App Purchase**.
- [ ] At the top of this page you will see a line labeled **Issuer ID** with a long string that looks like a UUID (e.g. `57246542-96fe-1a63-e053-0824d011072a`). **Copy this value now** and paste it into your handover note.
- [ ] Click **Generate In-App Purchase Key** (if you already have keys, click the **+** instead).
- [ ] Name the key `Sophie IAP Key` (this is just a label — you cannot change it later).
- [ ] Click **Generate**.
- [ ] On the next screen, note the **Key ID** shown (10 characters, mix of letters and digits). **Copy this value.**
- [ ] Click **Download API Key** (or **Download Key**). You will get a file named `SubscriptionKey_<KEY_ID>.p8`.

**IRREVERSIBLE — read carefully:**
- The `.p8` file can only be downloaded **once**. If you lose it, you must revoke the key and generate a new one.
- Store the `.p8` file in a password manager (1Password, Bitwarden, etc.). Do NOT email it in plaintext. Do NOT commit it to Git. Do NOT put it in Slack without a disappearing message.
- The Key ID and Issuer ID are not secret on their own, but the `.p8` file IS secret — treat it like a password.

---

## Step 3 — Find your Apple App ID

This is a 10-digit number unique to Speak With Sophie. Different from the Bundle ID.

- [ ] From the App Store Connect home, click **Apps**.
- [ ] Click **Speak With Sophie**.
- [ ] In the left sidebar, under **General**, click **App Information**.
- [ ] Scroll down to the **General Information** section. Find the field labeled **Apple ID** (sometimes shown as "App Apple ID").
- [ ] It is a 10-digit number like `1234567890`. Copy this value.

(Alternatively: when the app is live, it also appears in the App Store URL as the digits after `id`, e.g. `https://apps.apple.com/app/id1234567890`.)

---

## Step 4 — Create the Subscription Group

A **Subscription Group** is a container. Users can only be subscribed to ONE product in a given group at a time, which is why monthly + semi-annual go into the SAME group.

**Where to go:** App Store Connect home → **Apps** → **Speak With Sophie**.

- [ ] In the left sidebar, locate the heading **Monetization** and under it click **Subscriptions**.
  - Older App Store Connect UI: the same item sits under a heading called **Features** instead of **Monetization**. If you don't see Monetization, look for Features.
- [ ] If the page shows "To create subscriptions, you must have an active Paid Apps agreement" — go back and finish Step 1.
- [ ] Under **Subscription Groups**, click the **+** (add) button, or the **Create** button if this is your first group.
- [ ] Enter **Reference Name**: `Sophie Premium` (this is internal — shows in Sales reports, NOT to users).
- [ ] Click **Create**.

### 4a. Add a Subscription Group localization (required before submission)

You can't submit without at least one localization on the group.

- [ ] On the Subscription Group page, find the section **App Store Localizations** (or "Subscription Group Localization") and click the **+** button.
- [ ] Locale: **English (U.S.)**
- [ ] Subscription Group Display Name: `Sophie Premium`
- [ ] Click **Add** / **Save**.
- [ ] If you want other languages, repeat. (Optional, but recommended for locales you ship in.)

---

## Step 5 — Create the Monthly Product

- [ ] Still inside the **Sophie Premium** group page, find **Subscriptions** and click the **+** (or **Create**) button.
- [ ] Fill in:
  - **Reference Name**: `Sophie Premium Monthly` (internal only)
  - **Product ID**: `ai.speakwithsophie.app.premium.monthly` — **type this exactly**, lowercase, no spaces. This MUST match what the developer hardcoded. **Cannot be changed later.**
- [ ] Click **Create**.

### 5a. Subscription duration

- [ ] On the product detail page, find **Subscription Duration**. Choose **1 Month** from the dropdown.
- [ ] Click **Save**.

### 5b. Price

- [ ] Scroll to **Subscription Prices**. Click **Add Subscription Price** (or the **+** button, or **Set Up Subscription Prices**).
- [ ] Choose the **base country/region** — usually **United States**.
- [ ] Select **USD 7.99** from the price tier list (Apple shows tiers, not freeform dollar amounts — pick the one closest to $7.99; the exact tier may be labeled "Tier 8" or similar depending on current App Store tiering).
- [ ] Click **Next**. Apple shows a table of **auto-calculated prices for all 175 territories** with appropriate currency conversions and taxes baked in.
- [ ] Review and click **Confirm**. You can adjust individual territories later if needed.

### 5c. Localizations (required)

- [ ] On the product page, find **App Store Localizations** (for the product, not the group).
- [ ] Click **+**. Locale: **English (U.S.)**.
- [ ] **Subscription Display Name**: `Sophie Premium Monthly`
- [ ] **Description**: `Unlimited Sophie conversations, billed monthly. Auto-renews until cancelled.`
- [ ] Click **Save**.
- [ ] Repeat for every locale your app ships in (the developer will tell you which ones — minimum English).

### 5d. Review information (required before review)

- [ ] Scroll to **Review Information**.
- [ ] **Screenshot**: upload a screenshot of the paywall inside the app. The developer will send you a PNG at 1290 × 2796 pixels (iPhone 16 Pro Max portrait) or 2048 × 2732 (iPad Pro). PNG preferred.
- [ ] **Review Notes**: paste `This subscription unlocks unlimited voice conversations with the Sophie AI tutor. Sign in with the demo account provided in App Review notes to reach the paywall from Settings > Subscription.`
- [ ] Click **Save**.

### 5e. Tax category and family sharing

- [ ] **Tax Category**: default is fine unless the developer specifies otherwise. For a digital subscription service, use **Services**.
- [ ] **Family Sharing**: leave OFF unless the developer explicitly asks for it.

---

## Step 6 — Create the Semi-annual Product

Repeat Step 5 inside the **same Subscription Group** (`Sophie Premium`), with these differences:

- [ ] **Reference Name**: `Sophie Premium Semiannual`
- [ ] **Product ID**: `ai.speakwithsophie.app.premium.semiannual`
- [ ] **Duration**: **6 Months**
- [ ] **Base price**: USD **11.99** (pick the nearest tier)
- [ ] **Display Name**: `Sophie Premium 6 Months`
- [ ] **Description**: `Unlimited Sophie conversations, billed every 6 months. Auto-renews until cancelled.`
- [ ] Upload the same (or a variant) paywall screenshot.
- [ ] Save.

**Do NOT put a free trial on this product** — Apple only allows one intro offer per customer per subscription group, and we want the trial on Monthly only.

---

## Step 7 — Add the 7-Day Free Trial (Introductory Offer)

- [ ] Go back to the **Monthly** product (`ai.speakwithsophie.app.premium.monthly`).
- [ ] Find the **Subscription Prices** section. Click **View All Subscription Pricing** (newer UI) or the **+** next to the price list.
- [ ] Click **Set Up Introductory Offer** (older UI: **Create Introductory Offer**).
- [ ] **Countries/Regions**: click **Select All** (so the trial is available everywhere the product is). Click **Next**.
- [ ] **Start date**: today (or the date you want the offer to become available).
- [ ] **End date**: leave blank so the offer does not expire automatically. Click **Next**.
- [ ] **Type**: choose **Free**.
- [ ] **Duration**: choose **7 Days** from the dropdown.
- [ ] Click **Next**.
- [ ] Review the summary. Click **Confirm**.

**IRREVERSIBLE caveat:** Once created, an introductory offer **cannot be edited**. To change it, you must delete and recreate it. Double-check duration and type before confirming.

**Eligibility rule (for your awareness):** Each Apple Account can only use one intro offer per subscription group — ever. Returning users cannot get a second free trial.

---

## Step 8 — Configure App Store Server Notifications v2

**Important:** the developer needs to give you the two webhook URLs (production + sandbox) first. If they have not been deployed yet, SKIP this step and come back at Step 11 after the developer confirms the backend is live.

**Where to go:** App Store Connect home → **Apps** → **Speak With Sophie** → sidebar **General** → **App Information**. Scroll down to the **App Store Server Notifications** section.

### 8a. Production URL

- [ ] Under **Production Server URL**, click **Set Up URL** (or **Edit** if one exists).
- [ ] Paste the production webhook URL the developer provided (looks like `https://api.speakwithsophie.ai/webhooks/apple/production`).
- [ ] For **Notification Version**, select **Version 2**. (Version 1 is deprecated — do NOT pick it.)
- [ ] Click **Save**.

### 8b. Sandbox URL

- [ ] Under **Sandbox Server URL**, click **Set Up URL**.
- [ ] Paste the sandbox webhook URL from the developer (e.g. `https://api.speakwithsophie.ai/webhooks/apple/sandbox`).
- [ ] Select **Version 2**.
- [ ] Click **Save**.

**Watch out:** If you fill ONLY the sandbox URL, production events will stop flowing. If you fill ONLY the production URL, both sandbox AND production notifications route to production. Always fill both.

---

## Step 9 — Create a Sandbox Tester account

This is a fake Apple ID that only works for paid purchases inside your app in test mode. It won't actually charge any card.

**Where to go:** App Store Connect home → **Users and Access**.

- [ ] Click **Users and Access**.
- [ ] At the top, click the **Sandbox** tab (older UI: **Sandbox Testers** in the sidebar).
- [ ] Click **+** (or **Create Test Accounts** the first time).
- [ ] Fill in:
  - **First name**: `Sophie` / **Last name**: `Tester`
  - **Email**: any unused address, e.g. `sophie-sandbox-1@yourdomain.com`. **Must not already be a real Apple ID anywhere.** Plus-addressing works: `admin+sophietest@yourdomain.com`.
  - **Password**: choose a strong one; write it down now — you won't be able to retrieve it later.
  - **Secret question/answer**: any values
  - **Date of birth**: anything that makes the account 18+
  - **App Store country/region**: **United States** (or whichever currency you want to test against)
- [ ] Click **Create**.

**IRREVERSIBLE:** You cannot edit the name, email, or password after creation. If you fat-finger the email, delete the tester and create a new one.

**Side note:** You do NOT verify the sandbox email — it's fake by design. Just make sure it's a string that Apple's live Apple ID system doesn't already know.

---

## Step 10 — Hand off to the developer

Copy this block, fill it in, and send it to the developer over a secure channel (1Password share, Signal, or an encrypted message — NOT email-in-plaintext for the `.p8`).

```
Apple IAP credentials for Speak With Sophie
-------------------------------------------
Issuer ID:          __________________________________________
Key ID:             __________
.p8 file:           [attached securely — do NOT paste contents here]
Apple App ID:       __________  (10-digit)
Bundle ID:          ai.speakwithsophie.app
Subscription Group: Sophie Premium
Product IDs:
  - ai.speakwithsophie.app.premium.monthly   ($7.99/mo, 7-day free trial)
  - ai.speakwithsophie.app.premium.semiannual ($11.99/6mo)
Sandbox tester email:    __________________
Sandbox tester password: __________________
```

- [ ] Issuer ID sent
- [ ] Key ID sent
- [ ] `.p8` file sent via 1Password/secure channel
- [ ] Apple App ID sent
- [ ] Sandbox tester credentials sent

The developer will now deploy the backend that handles Apple's webhooks, then come back to you with two URLs for Step 11.

---

## Step 11 — (after developer confirms backend deployed) Add webhook URLs

If you already did this in Step 8, skip. Otherwise, do Step 8 now.

- [ ] Production Server URL — filled (Version 2)
- [ ] Sandbox Server URL — filled (Version 2)

Send the developer a confirmation: "Both URLs saved, Version 2."

---

## Step 12 — (at submission time) Submit subscriptions with the build

When the developer asks you to submit a new build to review, the first subscription must be submitted with the app version. Apple's docs still describe an **In-App Purchases and Subscriptions** selector on the app version page, but the live 2026 App Store Connect UI may not show that selector. If it is absent, submit the subscription products and group localization from the **Monetization → Subscriptions** pages, then resubmit the app version.

**Where to go:** App Store Connect → **Apps** → **Speak With Sophie** → in the left sidebar, under **iOS App**, click the **version you're submitting** (e.g., `1.0.1 Prepare for Submission`).

- [ ] Scroll to the section **In-App Purchases and Subscriptions**, if it exists.
- [ ] If present, click the **+** or **Select In-App Purchases**.
- [ ] Tick the boxes for:
  - [ ] `ai.speakwithsophie.app.premium.monthly`
  - [ ] `ai.speakwithsophie.app.premium.semiannual`
- [ ] Click **Done** / **Save**.
- [ ] If the section is absent, go to **Monetization → Subscriptions → Sophie Premium** and verify:
  - [ ] Monthly product is **Ready to Submit** or **Waiting for Review**
  - [ ] Semiannual product is **Ready to Submit** or **Waiting for Review**
  - [ ] English (U.S.) group localization is **Ready to Submit** or **Waiting for Review**
- [ ] If a product shows **Developer Action Needed** or a localization shows **Rejected**, open the affected localization, make a small real metadata edit, save, then click **Submit for Review** on that product or group page.

**Before you hit Submit for Review:**

- [ ] All subscriptions show **Ready to Submit** or **Waiting for Review**.
- [ ] The build you are submitting has been uploaded and processed (will show in the build picker).
- [ ] App Review notes contain the demo account login. Current Apple demo account: `armanmishra1000@gmail.com`.
- [ ] App Review notes say whether an authentication code is required. For the current demo account, email 2FA is disabled and no authentication code is required.
- [ ] The App Store description includes a functional Terms of Use (EULA) link and Privacy Policy link.

Now click **Submit for Review**. Subscriptions are reviewed alongside the app. If the app is approved, they go live with the app; if rejected, you fix the issue and resubmit the same product.

**2026-04-28 live result for Speak With Sophie:** the version page did not show the selector, but Monthly, Semiannual, and the group localization were submitted from the Subscriptions pages and moved to **Waiting for Review**. Build 48 was then resubmitted and the iOS submission moved to **Waiting for Review**.

---

## Troubleshooting

**"I don't see the Subscriptions menu under Monetization."**
- Go to **Business** → **Agreements**. Paid Apps must be **Active** AND tax forms Active AND banking Active. If any row is pending, Subscriptions is hidden.

**"My tax form was rejected."**
- The reason is shown at the top of the Tax Forms page. Common causes: wrong entity type, missing Foreign TIN (Indian companies must put the PAN in the Foreign TIN field), or missing authorized signer name.

**"Price tier won't save."**
- Apple requires a **base country** to be selected first. Set USD as base, then confirm the auto-generated global table.

**"Introductory offer menu is grayed out."**
- The product has to be in **Ready to Submit** status before an intro offer can be added. Finish localizations + review screenshot first.

**"Sandbox tester cannot log in during testing."**
- Sandbox testers log in in the device **Settings app** → scroll to the bottom → **Developer** or **App Store** → **Sandbox Account**, NOT in the main Apple ID screen. Developer will instruct their testers.

**"Product shows Missing Metadata after I created it."**
- Open the product. Check: price set? English localization added (display name + description)? Review screenshot uploaded? All three are required.

**"It's been 48 hours and my bank account is still pending."**
- The Account Holder must log in and **approve** the banking change in the **Agreements → Bank Accounts** screen. Confirm with the Account Holder directly.

**"Apple App ID field is blank on my app."**
- The app record must be fully created first. If you just created the app today, wait ~15 minutes and refresh.

---

## Glossary

- **Auto-renewable subscription** — charges the user automatically on each renewal until they cancel.
- **Bundle ID** — the text identifier for the app (`ai.speakwithsophie.app`). Different from Product IDs and App ID.
- **Introductory offer** — a one-time discount for new subscribers (free trial, pay-up-front, or pay-as-you-go).
- **Issuer ID** — a UUID identifying your whole App Store Connect team for API auth.
- **Key ID** — a short ID (10 chars) for one specific API key. Paired with a `.p8` file.
- **.p8 file** — a private cryptographic key. Never share in plaintext. Downloadable ONCE.
- **Product ID (SKU)** — unique identifier for ONE purchasable product. Must match the code exactly.
- **Subscription Group** — container for related subscriptions; user can only hold one at a time.
- **Sandbox / Sandbox Tester** — Apple's test environment and fake Apple IDs for testing. No real money changes hands.
- **Webhook / Server Notification** — HTTP POST from Apple when subscription events happen (renew, refund, cancel).
- **JWS (JSON Web Signature)** — the signed format Apple uses so our backend can verify notifications.
- **App Store Server Notifications V2** — the current version. V1 is deprecated. Always pick V2.
- **Paid Apps Agreement** — the contract that lets your company sell paid content. Without it, no subscriptions.
- **Tier (price tier)** — Apple's preset price list. Pick the tier closest to your target price.
- **Storefront / Territory** — a country or region version of the App Store (175 total).

---

## Further reading

Official Apple documentation — bookmark these for reference:

1. https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/ — Create subscription groups and products.
2. https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/ — Free trials and intro offers.
3. https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-promotional-offers-for-auto-renewable-subscriptions/ — Later-stage promotional offers (not needed for launch).
4. https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/generate-keys-for-in-app-purchases/ — Generate the `.p8` key.
5. https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/enter-server-urls-for-app-store-server-notifications/ — Configure webhook URLs.
6. https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account/ — Sandbox tester setup.
7. https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/ — Sandbox testing overview.
8. https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/ — Sign the Paid Apps Agreement.
9. https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/ — Tax forms.
10. https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information/ — Banking.
11. https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions/ — Pricing across territories.
12. https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/in-app-purchase-and-subscriptions-pricing-and-availability/ — Pricing reference.
13. https://developer.apple.com/help/app-store-connect/manage-builds/choose-a-build-to-submit/ — Attaching builds + subscriptions to a submission.
14. https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review/ — Submission overview.
15. https://developer.apple.com/documentation/AppStoreServerNotifications/App-Store-Server-Notifications-V2 — V2 notification technical reference.
16. https://developer.apple.com/documentation/storekit/implementing-introductory-offers-in-your-app — StoreKit developer reference for intro offers.
