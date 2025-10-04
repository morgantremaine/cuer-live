-- Add row number locking fields to rundowns table
ALTER TABLE public.rundowns 
ADD COLUMN IF NOT EXISTS numbering_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_row_numbers JSONB DEFAULT '{}'::jsonb;

-- Add comment to describe the feature
COMMENT ON COLUMN public.rundowns.numbering_locked IS 'When true, row numbers are locked and new rows get letter suffixes (e.g., 6A, 6B)';
COMMENT ON COLUMN public.rundowns.locked_row_numbers IS 'Snapshot of locked row numbers in format: {"item-id": "6", "item-id-2": "6A"}';