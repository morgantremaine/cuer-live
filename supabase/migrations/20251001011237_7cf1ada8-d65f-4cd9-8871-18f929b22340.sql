-- Enable realtime for rundown_operations table
ALTER TABLE rundown_operations REPLICA IDENTITY FULL;

-- Add the table to the realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'rundown_operations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rundown_operations;
  END IF;
END $$;