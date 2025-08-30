-- First add show_date column to backup table to match rundowns table
ALTER TABLE public.rundown_recovery_backup 
ADD COLUMN show_date DATE;

-- Now add show_date column to rundowns table
ALTER TABLE public.rundowns 
ADD COLUMN show_date DATE;

-- Add index for better performance on date queries
CREATE INDEX idx_rundowns_show_date ON public.rundowns(show_date);

-- Update existing rundowns to extract date from start_time if it's an ISO string
UPDATE public.rundowns 
SET show_date = CASE 
  WHEN start_time ~ '^\d{4}-\d{2}-\d{2}T' THEN 
    DATE(start_time::timestamp)
  WHEN start_time ~ '^\d{4}-\d{2}-\d{2}' THEN 
    DATE(start_time)
  ELSE 
    DATE(created_at)
END
WHERE show_date IS NULL;