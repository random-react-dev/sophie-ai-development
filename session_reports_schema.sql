create table if not exists public.session_reports (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key text not null,
  learning_profile_id uuid null references public.learning_profiles(id) on delete set null,
  scenario_title text null,
  scenario_level text null,
  target_language text null,
  native_language text null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  message_count integer not null default 0 check (message_count >= 0),
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone not null default now(),
  primary key (id),
  unique (user_id, session_key)
);

create index if not exists session_reports_user_completed_at_idx
  on public.session_reports (user_id, completed_at desc);

alter table public.session_reports enable row level security;

drop policy if exists "Users can view their own session reports" on public.session_reports;
create policy "Users can view their own session reports"
  on public.session_reports
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own session reports" on public.session_reports;
create policy "Users can insert their own session reports"
  on public.session_reports
  for insert
  with check (auth.uid() = user_id);

create or replace function public.handle_session_report_insert()
returns trigger as $$
begin
  insert into public.user_stats (user_id, total_speaking_seconds, total_conversations)
  values (new.user_id, new.duration_seconds, 1)
  on conflict (user_id) do update set
    total_speaking_seconds = public.user_stats.total_speaking_seconds + new.duration_seconds,
    total_conversations = public.user_stats.total_conversations + 1,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

drop trigger if exists after_session_report_insert on public.session_reports;
create trigger after_session_report_insert
after insert on public.session_reports
for each row
execute function public.handle_session_report_insert();
