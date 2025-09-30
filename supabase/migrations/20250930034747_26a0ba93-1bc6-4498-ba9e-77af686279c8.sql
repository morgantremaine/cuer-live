-- Update rundown_operations table for operation-based system
ALTER TABLE public.rundown_operations 
ADD COLUMN IF NOT EXISTS sequence_number BIGSERIAL,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for efficient operation queries
CREATE INDEX IF NOT EXISTS idx_rundown_operations_sequence ON public.rundown_operations (sequence_number);
CREATE INDEX IF NOT EXISTS idx_rundown_operations_rundown_sequence ON public.rundown_operations (rundown_id, sequence_number);

-- Add operation_mode_enabled flag to rundowns table
ALTER TABLE public.rundowns 
ADD COLUMN IF NOT EXISTS operation_mode_enabled BOOLEAN DEFAULT false;

-- Create function to get next sequence number
CREATE OR REPLACE FUNCTION get_next_sequence_number()
RETURNS BIGINT AS $$
DECLARE
    next_seq BIGINT;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq FROM rundown_operations;
    RETURN next_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;