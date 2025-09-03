-- Add a show_date column to the rundowns table for date selection
ALTER TABLE public.rundowns 
ADD COLUMN IF NOT EXISTS show_date DATE;