-- Create a backup table to prevent further data loss
CREATE TABLE IF NOT EXISTS rundown_recovery_backup AS 
SELECT * FROM rundowns 
WHERE user_id = '93407565-888c-42e1-93a9-9757e24c43ae' 
AND updated_at > '2025-08-29 16:00:00';

-- Add a trigger to log all future rundown changes for this user
CREATE OR REPLACE FUNCTION log_rundown_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id = '93407565-888c-42e1-93a9-9757e24c43ae' THEN
    INSERT INTO rundown_recovery_backup 
    SELECT NEW.* 
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'rundown_changes_backup'
  ) THEN
    CREATE TRIGGER rundown_changes_backup
      AFTER UPDATE ON rundowns
      FOR EACH ROW
      EXECUTE FUNCTION log_rundown_changes();
  END IF;
END $$;