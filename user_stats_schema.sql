-- Create the user_stats table
create table public.user_stats (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  total_speaking_seconds integer default 0,
  total_conversations integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id),
  unique (user_id)
);

-- Enable Row Level Security (RLS)
alter table public.user_stats enable row level security;

-- Policies for user_stats

-- Allow users to view their own stats
create policy "Users can view their own stats" on public.user_stats
  for select using (auth.uid() = user_id);

-- Allow users to insert their own stats
create policy "Users can insert their own stats" on public.user_stats
  for insert with check (auth.uid() = user_id);

-- Allow users to update their own stats
create policy "Users can update their own stats" on public.user_stats
  for update using (auth.uid() = user_id);

-- Create RPC function for atomic increment
create or replace function increment_user_stats(
  speaking_seconds_inc integer,
  conversations_inc integer
) returns void as $$
begin
  insert into user_stats (user_id, total_speaking_seconds, total_conversations)
  values (auth.uid(), speaking_seconds_inc, conversations_inc)
  on conflict (user_id) do update set
    total_speaking_seconds = user_stats.total_speaking_seconds + speaking_seconds_inc,
    total_conversations = user_stats.total_conversations + conversations_inc,
    updated_at = now();
end;
$$ language plpgsql security definer;
