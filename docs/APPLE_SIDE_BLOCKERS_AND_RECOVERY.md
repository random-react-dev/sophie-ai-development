# Apple-Side Blockers & Recovery Plan — Speak With Sophie

## ✅ STATUS — SUBMITTED 2026-04-28 (verified live ~10:22 IST)

| # | Blocker | State | Verified value |
|---|---|---|---|
| 1 | W-8BEN tax form | ✅ **Active** | Submitted 2026-04-25 |
| 2 | Bank account | ✅ **Active** | ICICI Bank Limited (1227), India, INR→USD — admin chose Path A (new Apexture account) |
| 3 | Paid Apps Agreement | ✅ **Active** | Apr 15, 2026 – Feb 14, 2027 |
| 4 | Subscription Group localization "Sophie Premium" | ✅ **Waiting for Review** | Was "Rejected" |
| 5a | Sophie Premium Monthly | ✅ **Waiting for Review** | Was "Developer Action Needed" |
| 5b | Sophie Premium Semiannual | ✅ **Waiting for Review** | Was "Developer Action Needed" |
| 6 | App Store metadata for subscriptions | ✅ **Fixed** | App description now includes Terms of Use (EULA) and Privacy Policy links |
| 7 | App Review notes | ✅ **Updated** | Notes say no auth code is required for demo account; include product IDs and test path |
| 8 | iOS 1.0.2 build 48 submission | ✅ **Waiting for Review** | Submission `cf0226b0-bd85-4b0c-92e3-28366f11eca3`, submitted Apr 28, 2026 10:22 AM IST |

**IAP confirmed working in local Simulator** — `WARN [IAP] purchaseError: user-cancelled` proves `fetchProducts` returns products, Subscribe button is tappable, and Apple's purchase sheet now presents. The empty-products error is gone.

**Current App Store Connect state:**
- iOS submission page: **Waiting for Review**
- Submitted item: **iOS App 1.0.2 (48)**
- Monthly subscription: **Waiting for Review**
- Semiannual subscription: **Waiting for Review**
- Subscription group localization: **Waiting for Review**

**Next step:** monitor App Review. If Apple rejects again, read the new rejection text before changing code or Apple-side configuration.

The rest of this document is preserved for historical context — it documents the 5-blocker diagnosis and the steps that the admin successfully followed to clear them.

---

## Historical diagnosis

At the time of the original diagnosis there were **5 distinct blockers** in App Store Connect, arranged in a dependency chain. Until the top items were fixed, the bottom ones could not move. Once the chain cleared, both the in-app purchase rejection path and the local `fetchProducts: 0` symptom were expected to resolve without code changes.

| # | Blocker | Where | Status at original diagnosis | Severity |
|---|---|---|---|---|
| 1 | **Missing tax form** — "U.S. Certificate of Foreign Status of Beneficial Owner" (W-8BEN, individual) | Business → Agreements → Tax Forms | ❌ Missing Tax Info | 🔴 Critical |
| 2 | **Bank account name mismatch** — bank holder is "OLGUIN FAST EVOLVING & EFFICIENT TECHNOLOGIES FZCO" (UAE) but Apple legal entity is "Apexture Private Limited" (India) | Business → Agreements → Bank Accounts | ❌ Processing | 🔴 Critical |
| 3 | **Paid Apps Agreement** | Business → Agreements | ❌ Pending User Info | 🔴 Critical (cannot become Active until #1 + #2 are done) |
| 4 | **Subscription Group localization** — English (U.S.) for "Sophie Premium" group | App → Subscriptions → Sophie Premium | ❌ Rejected | 🟡 Easy fix (one click + edit + save) |
| 5 | **Both subscription products** — "Sophie Premium Monthly" + "Sophie Premium Semiannual" | App → Subscriptions → Sophie Premium → each product | ❌ Developer Action Needed | 🟡 Easy fix (depends on #4) |

The original expectation was that once items 1–5 were green, item 6 would happen automatically:

| 6 | **"In-App Purchases and Subscriptions" section reappears on v1.0.2 version page**, products become attachable, fetchProducts returns 2 products | Partially superseded 2026-04-28: the section still did not appear, but products/group localization moved to Waiting for Review and build 48 resubmitted successfully |

---

## Why this is the actual root cause (with evidence)

### Evidence #1 — Agreements page

URL: https://appstoreconnect.apple.com/agreements/

What the page shows live:

- Top banner: *"Your banking updates are processing, and you should see the changes in 24 hours."*
- Top banner: *"One or more tax forms still need to be completed for your account. Please submit them as soon as possible."*
- **Free Apps Agreement** — Active (Mar 30, 2026)
- **Paid Apps Agreement** — **Pending User Info** (Apr 15, 2026)
- **Bank Account** — *OLGUIN FAST EVOLVING & EFFICIENT TECHNOLOGIES FZCO (2459)* — United Arab Emirates — AED → USD — **Processing**
- **Tax Form A** — U.S. Substitute Form W-8BEN-E — **Active** (Apr 15, 2026)
- **Tax Form B** — U.S. Certificate of Foreign Status of Beneficial Owner — **Missing Tax Info** ← This is the W-8BEN (individual) form

### Evidence #2 — Subscription Group page

URL: https://appstoreconnect.apple.com/apps/6759192122/distribution/subscription-groups/22034127

- Banner: *"One or more subscriptions below require your attention."*
- Banner: *"Your first subscription must be submitted with a new app version."*
- **Sophie Premium Monthly** (`ai.speakwithsophie.app.premium.monthly`) → Status: **Developer Action Needed**
- **Sophie Premium Semiannual** (`ai.speakwithsophie.app.premium.semiannual`) → Status: **Developer Action Needed**
- **Group localization** English (U.S.) "Sophie Premium" → Status: **Rejected**
- **No duplicate "Sophie Premium Monthly"** — earlier hypothesis was a false alarm; there are exactly 2 products

### Evidence #3 — v1.0.2 version page

URL: https://appstoreconnect.apple.com/apps/6759192122/distribution/ios/version/inflight

- Heading: "iOS App Version 1.0.2"
- Top alert: *"This item requires your attention" / "The item you submitted was rejected"*
- Rejection codes: **2.1.0 Performance: App Completeness** + **3.1.2 Business: Payments – Subscriptions**
- Submission ID: `cf0226b0-bd85-4b0c-92e3-28366f11eca3`
- Build attached: 46 (1.0.2)
- **Confirmed by full-page scan**: NO "In-App Purchases and Subscriptions" section anywhere on the page

### Why this single chain explains both symptoms

Apple's StoreKit will only return product metadata to a client when the seller's **Paid Apps Agreement is Active**. With the agreement in "Pending User Info" status:

- The TestFlight build's `fetchProducts` returns `[]` → matches the build 46 reviewer's "we cannot locate the In-App Purchases" report
- The local Simulator's `fetchProducts` returns `[]` → matches the dev console log

Once the agreement flips to Active, both will start returning the 2 products immediately (assuming items 4 and 5 are also fixed so the products themselves are in a clean state).

---

## Step-by-step fix (in dependency order)

### Step 1 — Add the missing W-8BEN tax form (15–30 min)

**Owner:** Admin — Apexture's authorized signer.
**Why:** Apple needs a beneficial-owner declaration (W-8BEN) in addition to the entity declaration (W-8BEN-E) that's already on file. Without both, the Paid Apps Agreement cannot become Active.

**Background (verified from Apple docs):**
- **W-8BEN-E** = entity form (Apexture Private Limited as a company) — already submitted, Active.
- **W-8BEN** = individual form (a beneficial owner — typically a director or person with >25% control) — currently MISSING.
- This is normal for incorporated foreign entities; Apple requires both pieces.

**Steps:**

1. Go to https://appstoreconnect.apple.com/agreements/
2. Scroll to **Tax Forms**.
3. In the row **"U.S. Certificate of Foreign Status of Beneficial Owner"**, click the **"Add Tax Info"** button.
4. Apple will run a short questionnaire to determine the right form. Answer honestly:
   - Are you an individual or entity? → If asked about the beneficial owner, select **Individual**.
   - Country of tax residence → **India**
   - Tax ID → use the individual's **PAN** (10-character alphanumeric, e.g. `ABCDE1234F`).
5. Apple will then present the W-8BEN form prefilled with what you entered. Fill in:
   - Name (the individual's legal name as on the PAN card)
   - Permanent address in India (must be a residential address, not a company address)
   - Date of birth
   - Tax treaty article claim — **India–US treaty, Article 12 (Royalties)** is the one Apple typically uses for app sales
   - Sign with the individual's name and date
6. Click **Submit**. The status should move from "Missing Tax Info" → "Pending Validation" within a few minutes, then to **Active** within a few hours.

**Verification after Step 1:**
- Refresh the Agreements page. The form row should show status **Active**.
- The top banner *"One or more tax forms still need to be completed"* should disappear.

**If you hit a snag:**
- *"Tax ID rejected"* — the PAN must be valid and not previously used on another Apple Developer account.
- *"Treaty article doesn't apply"* — pick a different article from the dropdown; Apple's UI will only allow valid combinations.
- If unclear which beneficial owner to declare, Apple's rule of thumb is: any natural person who owns ≥25% of the entity. For Apexture, that is typically the founder/director.

---

### Step 2 — Resolve the bank account legal-entity-name mismatch (1–3 days, depends on chosen path)

**Owner:** Admin + Finance.
**Why:** Apple requires the bank account holder name to **exactly match** the legal entity name on the developer account (verified in Apple's docs and Apple Developer Forum thread 710822). Today they don't match.

| Field | Current value | Match? |
|---|---|---|
| Apple legal entity | **Apexture Private Limited** (Surat, Gujarat, India — DUNS 94019197) | — |
| Bank account holder | **OLGUIN FAST EVOLVING & EFFICIENT TECHNOLOGIES FZCO** (UAE) | ❌ DOES NOT MATCH |

**You must pick ONE of these three paths.** Talk with the company's accountant/finance lead before choosing.

#### Path A (recommended) — Submit a bank account in Apexture's name

**When to choose:** Apexture Private Limited is the actual seller of the app and should receive the revenue.

1. Open a USD-receivable bank account in **Apexture Private Limited**'s name (most Indian banks offer this — typically called an EEFC or USD-denominated current account). HDFC, ICICI, Axis, and Kotak all support this for Indian Pvt Ltd companies.
2. Gather: bank name, branch name + address, SWIFT code, account number, IFSC code.
3. In App Store Connect → Business → Agreements → **Bank Accounts**, click the existing OLGUIN row and **Remove** it (or click **Add Bank Account** to add the new one in parallel).
4. Add the new Apexture-named bank account. Account holder name MUST be typed exactly as `Apexture Private Limited` (case and spacing matching the Apple legal entity record).
5. Save. Status will go to **Processing** for ~24h, then **Active**.

**Pros:** Cleanest, no Apple intervention required. Funds flow to the company that legally signed the developer agreement.
**Cons:** Requires opening a new bank account if Apexture doesn't already have a USD-receivable one. India's RBI rules require specific paperwork for foreign currency receipts.

#### Path B — Change the Apple legal entity to OLGUIN FAST EVOLVING & EFFICIENT TECHNOLOGIES FZCO

**When to choose:** OLGUIN FZCO is the actual selling entity and Apexture is just the historical/admin name. (Less likely given the Apple Developer Account is enrolled under Apexture.)

1. This requires contacting Apple Developer Support — Apple does not let you self-edit the legal entity name. URL: https://developer.apple.com/contact/topic/select → **Membership and Account** → **Update or transfer your membership**.
2. Apple will require:
   - A signed letter from the current legal entity (Apexture) authorizing the transfer to OLGUIN
   - OLGUIN's certificate of incorporation
   - OLGUIN's D-U-N-S Number (separate from Apexture's)
   - Signatures from both directors
3. Apple Support will verify (typically 5–10 business days), then change the entity. The bank account already on file will then match.

**Pros:** Avoids opening a new bank account.
**Cons:** Slow. Requires legal documentation. Risk of Apple denying the transfer if there's no clean corporate connection between Apexture and OLGUIN.

#### Path C — Add OLGUIN as a separate Apple Developer Account legal entity

**When to choose:** Both Apexture and OLGUIN need to be on Apple's records (e.g., Apexture is the signing entity, OLGUIN is a payment processor with mutual consent).

1. Apple does not generally allow two legal entities on a single developer account. This path is **not recommended** — Apple Support typically refuses.
2. Skip this option unless the accountant has a specific reason and Apple's compliance team has explicitly approved.

**Verification after Step 2:**
- Refresh the Agreements page. The Bank Accounts table shows the new account with status **Processing** initially, then **Active** after ~24h.
- The Paid Apps Agreement row will move from **Pending User Info** → **Processing** → **Active** as steps 1 and 2 complete.

---

### Step 3 — Wait for the Paid Apps Agreement to go Active (~24h after Steps 1 + 2)

**Owner:** Nobody — Apple processes automatically.
**Why:** Per Apple's official status reference, "Pending User Info" auto-flips to "Processing" once all required user info is in, then to **Active** after their compliance review.

**What to monitor:**
- Refresh https://appstoreconnect.apple.com/agreements/ once a day.
- Status sequence: Pending User Info → Processing → Verifying → **Active**.

**If stuck >48h after Steps 1+2 are visibly green:**
- Contact Apple Developer Support → "Reports and Payments" → "Paid Agreement Status".
- Quote: legal entity name, App Apple ID `6759192122`, agreement effective date `Apr 15, 2026`.

**Why this matters for IAP:**
StoreKit returns 0 products when the agreement is in any state other than Active. This is why the local Simulator AND the App Review reviewer both see empty product lists — same root cause.

---

### Step 4 — Fix the Subscription Group localization "Rejected" status (5 min)

**Owner:** Admin.
**Why:** When App Review rejected build 46, the subscription group localization was marked Rejected as collateral. It needs a developer action to clear, even if no actual content needs to change.

**Steps:**

1. Go to https://appstoreconnect.apple.com/apps/6759192122/distribution/subscription-groups/22034127
2. Scroll to the **Localization** section.
3. Click **English (U.S.)** in the table.
4. The localization editor opens. Either:
   - **Make a real edit** — improve the display name or add a tagline, OR
   - **Trivial edit** — append a single space to the description, then delete it (this is enough to mark the field "modified" without changing visible content). Per Apple Forum thread 730304, this is the documented workaround.
5. Click **Save**.
6. Status should change from **Rejected** → **Prepare for Submission**.

**Verification:**
- Localization status row now shows **Prepare for Submission** or **Waiting for Review** (not Rejected).

---

### Step 5 — Clear "Developer Action Needed" on both products (5 min each)

**Owner:** Admin.
**Why:** Both products inherited Rejected → Developer Action Needed status from the build 46 rejection. Same fix as Step 4 — trivial edit to mark the metadata as "touched."

**Steps for each product** (Sophie Premium Monthly AND Sophie Premium Semiannual):

1. Go to the subscription group page (URL above), click the product name in the table.
2. Scroll to the **Localization** section of the product detail page.
3. Click **English (U.S.)** in the table.
4. Make a trivial edit (e.g., add then remove a space at the end of the description).
5. Click **Save**.
6. Status should change from **Rejected** → **Prepare for Submission**.
7. Repeat for the second product.

**Optional but recommended quality improvements while you're in there:**
- Confirm the **review screenshot** is still uploaded (visible in the Review Information section).
- Confirm the **English description** matches what's promised in the app — currently `"Unlimited Sophie conversations, billed monthly."` and the equivalent for semiannual.

**Verification after Step 5:**
- Subscription group page now shows both products with status **Prepare for Submission** (or **Waiting for Review** if you've already clicked Submit on the version page).

---

### Step 6 — Confirm the IAP attachment section reappears on the version page

**Owner:** Admin or developer.
**Why:** Apple documentation still references an "In-App Purchases and Subscriptions" section on the version page for first subscriptions, but the live 2026 App Store Connect UI did not show this section for this app. Once products were resubmitted and the app was resubmitted, the subscription products and group localization moved to **Waiting for Review**.

1. Go to https://appstoreconnect.apple.com/apps/6759192122/distribution/ios/version/inflight
2. Scroll the entire page. Look for the heading **"In-App Purchases and Subscriptions"**.
3. If present: click the **+** or **Select In-App Purchases** button. Tick BOTH:
   - `ai.speakwithsophie.app.premium.monthly`
   - `ai.speakwithsophie.app.premium.semiannual`
4. Save. Each row should show a green dot ("Ready to Submit").

**Live 2026-04-28 result:** the section was still absent, but App Store Connect allowed build 48 to be resubmitted after the two products and the group localization were separately submitted. All three subscription-related items are now **Waiting for Review**.

---

### Step 7 — Resubmit build 48 for App Review

**Owner:** Developer (with admin verification).

Completed 2026-04-28:

1. Build 48 was attached to iOS version 1.0.2.
2. App Store description was updated with:
   - `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
   - `https://www.speakwithsophie.ai/privacy`
3. App Review notes were updated with the demo-account access note: no authentication code is required because email 2FA is disabled for the demo account.
4. Clicked **Update Review**, then **Resubmit to App Review**.
5. App Store Connect status changed to **Waiting for Review**.

---

## What success looks like (verification checklist)

After all steps are complete, every one of these should be true:

- [x] Agreements page top banner is gone (no "tax form" or "banking" warnings)
- [x] **Paid Apps Agreement** status = **Active**
- [x] **Bank Account** status = **Active** — ICICI Bank Limited (1227), India
- [x] **All Tax Forms** = **Active** (no "Missing Tax Info" rows)
- [x] **Subscription Group localization** status = **Waiting for Review**
- [x] **Sophie Premium Monthly** status = **Waiting for Review**
- [x] **Sophie Premium Semiannual** status = **Waiting for Review**
- [x] App Store description includes Terms of Use (EULA) and Privacy Policy links
- [x] Local Simulator purchase sheet presents; cancel logs `WARN [IAP] purchaseError: user-cancelled`
- [x] Build 48 submitted for review — iOS submission status **Waiting for Review**

---

## Estimated total timeline

| Step | Time required |
|---|---|
| 1 — Add W-8BEN | 15–30 min admin work + few hours Apple validation |
| 2 — Bank account fix (Path A) | 1–3 business days (open new bank account) + 24h Apple processing |
| 2 — Bank account fix (Path B) | 5–10 business days (Apple Support entity change) |
| 3 — Wait for Paid Apps Agreement → Active | ~24h after Steps 1+2 done |
| 4 — Fix group localization | 5 min |
| 5 — Fix both product localizations | 10 min |
| 6 — Verify IAP section appears + attach products | 5 min |
| 7 — Upload build 47 + submit | 30 min |
| App Review turnaround | 24–48h (typical) |

**Realistic total** (Path A for Step 2): **3–5 business days** from start to next App Review decision.
**Pessimistic total** (Path B for Step 2): **10–15 business days**.

---

## What we are NOT doing (and why)

- **NOT filing the Forum 820936 bug ticket.** That hypothesis was wrong — the IAP section is missing because of the prerequisite chain above, not because of an Apple platform bug. Filing a false-positive ticket would waste 24–72h of Apple Support time and won't unblock anything.
- **NOT adding `com.apple.developer.in-app-purchase` to the iOS entitlements file.** StoreKit requires zero entitlements; build 44 was approved without it. This was correctly flagged as a wrong suggestion in the recovery memo.
- **NOT modifying the iOS app code.** Build 47 already has the correct StoreKit usage (`react-native-iap@15.0.2`), the right SKUs, the right bundle ID, and additional diagnostic logging. There is nothing to change in code.
- **NOT signing up for Sentry / Crashlytics yet.** The structured `console.warn` logs added in build 47 are sufficient for diagnosing the next "0 products" event if one occurs after this fix lands.
- **NOT trying to bypass the Paid Apps Agreement requirement.** No workaround exists — Apple's StoreKit gates product metadata on Active agreement status. The only fix is to make the agreement Active.

---

## Sources (verified 2026-04-25)

Apple official documentation:
- [App Store Connect — View agreements status (Pending User Info, Active, etc.)](https://developer.apple.com/help/app-store-connect/manage-agreements/view-agreements-status/)
- [App Store Connect — Sign and update agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)
- [App Store Connect — Enter banking information](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information/)
- [App Store Connect — In-App Purchase localization statuses (Approved, Rejected, Waiting for Review)](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-localization-statuses/)
- [App Store Connect — Provide tax information (W-8BEN, W-8BEN-E)](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/)
- [Apple Developer — Updating your account information (legal entity changes)](https://developer.apple.com/help/account/membership/updating-your-account-information/)
- [Apple Developer Forums — Change legal entity? (thread 710822)](https://developer.apple.com/forums/thread/710822)
- [Apple Developer Forums — Status "Pending User Info" (thread 126928)](https://developer.apple.com/forums/thread/126928)
- [Apple Developer Forums — "Rejected" and "Developer Action Needed" (thread 730304)](https://developer.apple.com/forums/thread/730304)

Cross-checked third-party guides (referenced for the W-8BEN/W-8BEN-E distinction in the India context and the bank-name-match rule):
- [Karbon Card — U.S. Tax Forms for Indian Companies: W-8BEN and W-8BEN-E](https://www.karboncard.com/blog/guide-to-w-8ben-and-w-8ben-e)
- [Razorpay — How to Fill W-8BEN & W-8BEN-E Forms in India](https://razorpay.com/blog/form-w-8ben-and-w-8ben-e/)
- [Skydo — Filing W-8BEN and W-8BEN-E: A Guide for Indian Freelancers and Businesses](https://www.skydo.com/blog/filing-w-8ben-and-w-8ben-e-a-guide-for-indian-freelancers-and-businesses)
- [Codegenes — Why Can't I Add a New Bank Account in App Store Connect (admin/legal-agent troubleshooting)](https://www.codegenes.net/blog/why-can-t-i-add-a-new-bank-account-for-my-app-store-connect/)
- [fluffy.es — Zero IAP products checklist (Items 1, 2, 3 cover Agreement, Tax, Bank)](https://fluffy.es/zero-iap-products-checklist/)

Live App Store Connect URLs used during the inspection:
- [Business → Agreements](https://appstoreconnect.apple.com/agreements/)
- [Apps → Speak With Sophie → Subscriptions → Sophie Premium group](https://appstoreconnect.apple.com/apps/6759192122/distribution/subscription-groups/22034127)
- [Apps → Speak With Sophie → Sophie Premium Monthly product](https://appstoreconnect.apple.com/apps/6759192122/distribution/subscriptions/6762272878)
- [Apps → Speak With Sophie → v1.0.2 version page (rejected)](https://appstoreconnect.apple.com/apps/6759192122/distribution/ios/version/inflight)
- [Submission cf0226b0-bd85-4b0c-92e3-28366f11eca3 (build 46 rejection details)](https://appstoreconnect.apple.com/apps/6759192122/distribution/reviewsubmissions/details/cf0226b0-bd85-4b0c-92e3-28366f11eca3)
