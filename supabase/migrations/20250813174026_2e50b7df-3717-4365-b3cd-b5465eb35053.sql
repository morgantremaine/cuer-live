-- Fix realtime configuration for rundowns table
-- Set REPLICA IDENTITY FULL to ensure complete row data is sent with realtime updates
ALTER TABLE public.rundowns REPLICA IDENTITY FULL;

-- Ensure rundowns table is in the realtime publication
-- First check if it exists, then add it if needed
DO $$
BEGIN
    -- Add rundowns to realtime publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'rundowns'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rundowns;
    END IF;
END $$;