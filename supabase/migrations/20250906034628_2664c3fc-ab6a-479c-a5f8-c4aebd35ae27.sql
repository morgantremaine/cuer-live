-- Enable full row data for realtime on key tables
ALTER TABLE public.rundowns REPLICA IDENTITY FULL;
ALTER TABLE public.blueprints REPLICA IDENTITY FULL;

-- Ensure tables are part of the supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'rundowns'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.rundowns';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'blueprints'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blueprints';
  END IF;
END $$;