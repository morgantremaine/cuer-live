-- Enable per-cell save for test users' rundowns
UPDATE rundowns 
SET per_cell_save_enabled = true 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email IN ('morgan@cuer.live', 'morgantremaine@me.com')
);

-- Also enable per-cell save for new rundowns created by test users
-- by creating a trigger function
CREATE OR REPLACE FUNCTION enable_per_cell_for_test_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user creating the rundown is a test user
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.user_id 
    AND email IN ('morgan@cuer.live', 'morgantremaine@me.com')
  ) THEN
    NEW.per_cell_save_enabled = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically enable per-cell save for test users
DROP TRIGGER IF EXISTS set_per_cell_for_test_users ON rundowns;
CREATE TRIGGER set_per_cell_for_test_users
  BEFORE INSERT ON rundowns
  FOR EACH ROW
  EXECUTE FUNCTION enable_per_cell_for_test_users();