-- Revert constraint change on public.user_column_preferences
-- Safety: abort if duplicates per rundown_id exist to avoid data loss
DO $$ 
DECLARE 
  dup_exists boolean;
BEGIN
  -- Check if any rundown_id has more than one row
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_column_preferences
    GROUP BY rundown_id
    HAVING COUNT(*) > 1
  ) INTO dup_exists;

  IF dup_exists THEN
    RAISE EXCEPTION 'Cannot revert constraint: multiple rows exist per rundown_id in user_column_preferences. Resolve duplicates before enforcing UNIQUE(rundown_id).';
  END IF;

  -- Drop composite unique constraint on (user_id, rundown_id) if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'u'
      AND t.relname = 'user_column_preferences'
      AND n.nspname = 'public'
      AND (
        SELECT array_agg(att.attname ORDER BY att.attname)
        FROM unnest(c.conkey) AS key(attnum)
        JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = key.attnum
      ) = ARRAY['rundown_id','user_id']
  ) THEN
    EXECUTE (
      SELECT format('ALTER TABLE public.user_column_preferences DROP CONSTRAINT %I', c.conname)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE c.contype = 'u'
        AND t.relname = 'user_column_preferences'
        AND n.nspname = 'public'
        AND (
          SELECT array_agg(att.attname ORDER BY att.attname)
          FROM unnest(c.conkey) AS key(attnum)
          JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = key.attnum
        ) = ARRAY['rundown_id','user_id']
      LIMIT 1
    );
  END IF;

  -- Add back unique constraint on (rundown_id) if it's missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'u'
      AND t.relname = 'user_column_preferences'
      AND n.nspname = 'public'
      AND (
        SELECT array_agg(att.attname ORDER BY att.attname)
        FROM unnest(c.conkey) AS key(attnum)
        JOIN pg_attribute att ON att.attrelid = t.oid AND att.attnum = key.attnum
      ) = ARRAY['rundown_id']
  ) THEN
    ALTER TABLE public.user_column_preferences
      ADD CONSTRAINT user_column_preferences_rundown_id_key UNIQUE (rundown_id);
  END IF;
END $$;