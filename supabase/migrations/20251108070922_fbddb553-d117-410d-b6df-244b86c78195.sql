-- Add end_time column to rundowns table for storing rundown end time
ALTER TABLE public.rundowns 
ADD COLUMN end_time TEXT DEFAULT '00:00:00';