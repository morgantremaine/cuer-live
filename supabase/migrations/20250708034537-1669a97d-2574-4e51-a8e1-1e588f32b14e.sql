-- Add isLocked column to rundowns table to store lock state
ALTER TABLE public.rundowns 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;