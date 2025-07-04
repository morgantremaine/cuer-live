-- Add numbering system preference to rundowns table
ALTER TABLE public.rundowns 
ADD COLUMN numbering_system text DEFAULT 'sequential' CHECK (numbering_system IN ('sequential', 'letter_number'));

-- Add comment for clarity
COMMENT ON COLUMN public.rundowns.numbering_system IS 'Numbering system for rundown rows: sequential (1,2,3...) or letter_number (A1,A2,B1,B2...)';