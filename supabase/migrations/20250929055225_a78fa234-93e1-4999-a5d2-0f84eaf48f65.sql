-- Enable per-cell save for all users by updating existing rundowns
UPDATE rundowns 
SET per_cell_save_enabled = true 
WHERE per_cell_save_enabled = false OR per_cell_save_enabled IS NULL;

-- Update the trigger function to enable per-cell save for ALL new rundowns
CREATE OR REPLACE FUNCTION enable_per_cell_for_all_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Enable per-cell save for all new rundowns
  NEW.per_cell_save_enabled = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the old test-user-only trigger
DROP TRIGGER IF EXISTS set_per_cell_for_test_users ON rundowns;

-- Create new trigger to automatically enable per-cell save for all users
CREATE TRIGGER set_per_cell_for_all_users
  BEFORE INSERT ON rundowns
  FOR EACH ROW
  EXECUTE FUNCTION enable_per_cell_for_all_users();

-- Clean up the old test-user function
DROP FUNCTION IF EXISTS enable_per_cell_for_test_users();