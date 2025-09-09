-- Add missing columns to rundown_presence table for OT system
ALTER TABLE public.rundown_presence 
ADD COLUMN IF NOT EXISTS active_cell text,
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS client_id text;

-- Update the table to handle the new columns properly
CREATE INDEX IF NOT EXISTS idx_rundown_presence_active_cell ON public.rundown_presence(active_cell) WHERE active_cell IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rundown_presence_last_seen ON public.rundown_presence(last_seen);

-- Add missing column to rundown_operations table
ALTER TABLE public.rundown_operations 
ADD COLUMN IF NOT EXISTS client_id text;