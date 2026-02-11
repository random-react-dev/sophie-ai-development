-- Function to check if an email exists in auth.users
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(p_email)
  );
$$;

-- Grant execute permission to authenticated and anon users (needed on forgot password screen)
GRANT EXECUTE ON FUNCTION public.check_email_exists TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_exists TO anon;
