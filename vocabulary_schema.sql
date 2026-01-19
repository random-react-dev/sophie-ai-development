-- Create the vocabulary_folders table
create table public.vocabulary_folders (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  name text not null,
  constraint vocabulary_folders_pkey primary key (id),
  constraint vocabulary_folders_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

-- Enable Row Level Security (RLS)
alter table public.vocabulary_folders enable row level security;

-- Policies for vocabulary_folders

-- Allow users to view their own folders
create policy "Users can view their own folders" on public.vocabulary_folders
  for select using (auth.uid() = user_id);

-- Allow users to insert their own folders
create policy "Users can insert their own folders" on public.vocabulary_folders
  for insert with check (auth.uid() = user_id);

-- Allow users to update their own folders
create policy "Users can update their own folders" on public.vocabulary_folders
  for update using (auth.uid() = user_id);

-- Allow users to delete their own folders
create policy "Users can delete their own folders" on public.vocabulary_folders
  for delete using (auth.uid() = user_id);

-- Add folder_id to vocabulary table if it doesn't exist
-- Note: You might need to run this separately if the table modification fails due to existing data issues, but generally safe.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'vocabulary' and column_name = 'folder_id') then
    alter table public.vocabulary add column folder_id uuid references public.vocabulary_folders(id) on delete set null;
  end if;
end $$;
