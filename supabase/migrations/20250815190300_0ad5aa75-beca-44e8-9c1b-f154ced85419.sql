-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_make_rundown_public_on_share ON shared_rundown_layouts;

-- First, update all existing rundowns that have shared layouts to be public
UPDATE rundowns 
SET visibility = 'public',
    updated_at = now()
WHERE id IN (
  SELECT DISTINCT rundown_id 
  FROM shared_rundown_layouts
)
AND visibility != 'public';

-- Create a function to automatically make rundowns public when shared
CREATE OR REPLACE FUNCTION public.make_rundown_public_on_share()
RETURNS TRIGGER AS $$
BEGIN
  -- When a shared layout is created, automatically make the rundown public
  UPDATE rundowns 
  SET visibility = 'public',
      updated_at = now()
  WHERE id = NEW.rundown_id
  AND visibility != 'public';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically make rundowns public when shared
CREATE TRIGGER trigger_make_rundown_public_on_share
  AFTER INSERT ON shared_rundown_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.make_rundown_public_on_share();