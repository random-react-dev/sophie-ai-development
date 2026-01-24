-- Add RLS policies for vocabulary table UPDATE and SELECT operations
-- This fixes the "Failed to update phrase" error in Edit Phrase functionality

-- Ensure SELECT policy exists (UPDATE operations require SELECT permission)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vocabulary' 
    AND policyname = 'Users can view their own vocabulary'
  ) THEN
    CREATE POLICY "Users can view their own vocabulary"
    ON public.vocabulary
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure UPDATE policy exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vocabulary' 
    AND policyname = 'Users can update their own vocabulary'
  ) THEN
    CREATE POLICY "Users can update their own vocabulary"
    ON public.vocabulary
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Verify RLS is enabled on vocabulary table
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Display current policies for verification
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'vocabulary'
ORDER BY policyname;
