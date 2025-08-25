-- Add last_updated_by field to rundowns table for enhanced deduplication
ALTER TABLE public.rundowns 
ADD COLUMN last_updated_by UUID REFERENCES auth.users(id);

-- Update existing rundowns to set last_updated_by to user_id where possible
UPDATE public.rundowns 
SET last_updated_by = user_id 
WHERE last_updated_by IS NULL AND user_id IS NOT NULL;

-- Add index for performance on last_updated_by queries
CREATE INDEX IF NOT EXISTS idx_rundowns_last_updated_by 
ON public.rundowns(last_updated_by);

-- Add index for composite queries on id and last_updated_by for realtime deduplication
CREATE INDEX IF NOT EXISTS idx_rundowns_id_last_updated_by 
ON public.rundowns(id, last_updated_by);