-- Remove numbering system preference from rundowns table
ALTER TABLE public.rundowns 
DROP COLUMN IF EXISTS numbering_system;