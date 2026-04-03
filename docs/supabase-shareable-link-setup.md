# Supabase Setup: Shareable Link Feature

Everything below is done through the **Supabase Dashboard** — no CLI required.

---

## Part 1: Database Table

### 1. Open the SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. In the left sidebar, click **SQL Editor**
4. Click **New query**

### 2. Run the Table + Policies SQL

Paste the entire block below and click **Run**:

```sql
-- Create the shared_scenarios table
create table public.shared_scenarios (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  sophie_role text not null,
  user_role text not null,
  topic text not null,
  level text not null,
  context text not null,
  icon text not null default 'mic',
  created_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable Row Level Security
alter table public.shared_scenarios enable row level security;

-- Any logged-in user can read shared scenarios (needed to receive links)
create policy "Anyone can read shared scenarios"
  on public.shared_scenarios for select
  to authenticated
  using (true);

-- Users can only save their own scenarios
create policy "Users can insert own shared scenarios"
  on public.shared_scenarios for insert
  to authenticated
  with check (auth.uid() = user_id);
```

### 3. Verify

- Go to **Table Editor** in the left sidebar → you should see `shared_scenarios` listed
- Go to **Authentication → Policies** → under `shared_scenarios` you should see two policies:

| Policy Name | Operation |
|---|---|
| Anyone can read shared scenarios | SELECT |
| Users can insert own shared scenarios | INSERT |

---

## Part 2: Edge Function (Web Fallback Page)

This function serves the web page that opens when someone taps a share link without the app installed.

### 1. Open Edge Functions

In the left sidebar, click **Edge Functions**.

### 2. Create a New Function

Click **Deploy a new function** (or the **+** button).

- **Function name**: `share-scenario`
- **JWT verification**: make sure this is **turned OFF** — the function is a public web page, no login needed

### 3. Paste the Function Code

Replace any template code in the editor with the full code from this file in the project:

```
supabase/functions/share-scenario/index.ts
```

> **Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected into every Edge Function by Supabase — you do not need to configure them manually.

### 4. Deploy

Click **Deploy** (or **Save and Deploy**). Wait for the status to show as active.

### 5. Verify

Once deployed, test the function URL in a browser. Your function URL follows this pattern:

```
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/share-scenario?token=test
```

You can find your project ref in **Project Settings → General → Reference ID**.

Opening the URL should show a styled **"Scenario Not Found"** page — this confirms the function is running correctly.

---

## Part 3: Verify the Full Flow

Once both Part 1 and Part 2 are done:

1. Open the app and go to the **Scenarios** tab
2. Tap **Create Custom** and fill in Sophie's Role and Topic, then create it
3. The **"Scenario Created!"** screen appears — tap **Share Scenario**
4. The native share sheet opens with a link in this format:
   ```
   https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/share-scenario?token=<UUID>
   ```
5. Open that link in a browser → you should see the scenario preview web page with **"Open in Sophie AI"** and **"Download Sophie AI"** buttons
6. On a device with the app installed, tap **Open in Sophie AI** → the app opens to the scenario preview screen

---

## Summary Checklist

- [ ] `shared_scenarios` table created via SQL Editor
- [ ] Two RLS policies visible under Authentication → Policies
- [ ] `share-scenario` Edge Function deployed with JWT verification **OFF**
- [ ] Function URL returns a page (even the "not found" page) when opened in a browser
- [ ] Share flow tested end-to-end in the app
