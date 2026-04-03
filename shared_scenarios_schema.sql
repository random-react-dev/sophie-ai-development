-- shared_scenarios table
-- Run this in Supabase Dashboard SQL Editor
-- Allows users to share custom scenarios via a link

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

alter table public.shared_scenarios enable row level security;

-- Any authenticated user can read shared scenarios (needed to receive shared links)
create policy "Anyone can read shared scenarios"
  on public.shared_scenarios for select
  to authenticated
  using (true);

-- Users can only insert their own shared scenarios
create policy "Users can insert own shared scenarios"
  on public.shared_scenarios for insert
  to authenticated
  with check (auth.uid() = user_id);
