-- Enable per-cell save for specific test users
UPDATE rundowns 
SET per_cell_save_enabled = true, updated_at = now()
WHERE user_id IN (
  SELECT p.id 
  FROM profiles p 
  WHERE p.email IN ('morgan@cuer.live', 'morgantremaine@me.com')
);

-- Function to automatically enable per-cell save for test users on new rundowns
CREATE OR REPLACE FUNCTION public.auto_enable_per_cell_save_for_test_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is in test group
  IF EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = NEW.user_id 
    AND p.email IN ('morgan@cuer.live', 'morgantremaine@me.com')
  ) THEN
    NEW.per_cell_save_enabled := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new rundowns
DROP TRIGGER IF EXISTS trigger_auto_enable_per_cell_save ON rundowns;
CREATE TRIGGER trigger_auto_enable_per_cell_save
  BEFORE INSERT ON rundowns
  FOR EACH ROW
  EXECUTE FUNCTION auto_enable_per_cell_save_for_test_users();