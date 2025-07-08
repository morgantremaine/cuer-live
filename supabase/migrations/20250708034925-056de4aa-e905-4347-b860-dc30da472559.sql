-- Remove the is_locked column from rundowns table
ALTER TABLE public.rundowns 
DROP COLUMN IF EXISTS is_locked;