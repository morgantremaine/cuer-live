-- Fix security issues by enabling RLS on the backup table
ALTER TABLE rundown_recovery_backup ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for the backup table
CREATE POLICY "Users can access their own rundown backups"
ON rundown_recovery_backup
FOR ALL
USING (auth.uid() = user_id);

-- Fix the function security by adding search_path
CREATE OR REPLACE FUNCTION log_rundown_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = '93407565-888c-42e1-93a9-9757e24c43ae' THEN
    INSERT INTO rundown_recovery_backup 
    SELECT NEW.* 
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;