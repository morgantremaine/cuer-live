-- Drop the problematic trigger that uses the wrong function
DROP TRIGGER IF EXISTS update_blueprints_updated_at ON blueprints;

-- Create a simple updated_at trigger function specifically for blueprints
CREATE OR REPLACE FUNCTION update_blueprints_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger using the new function
CREATE TRIGGER update_blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_blueprints_updated_at_column();