-- Add per-tab identity column for own-update detection
ALTER TABLE public.rundowns
  ADD COLUMN IF NOT EXISTS tab_id uuid;

-- Ensure realtime delivers full rows (including new column)
ALTER TABLE public.rundowns REPLICA IDENTITY FULL;

-- Guarantee table is in realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rundowns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rundowns;
  END IF;
END $$;

COMMENT ON COLUMN public.rundowns.tab_id IS 'Per-tab identifier for last update; used by clients to ignore their own realtime events.';