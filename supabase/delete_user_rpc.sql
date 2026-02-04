-- Function to allow users to delete their own account
-- Run this in your Supabase SQL Editor

create or replace function delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Verify the user is authenticated
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete the user from auth.users (cascades to public.users and other tables if configured)
  delete from auth.users where id = current_user_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_user to authenticated;
