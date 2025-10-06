-- Function to check if user is admin of the team that owns a layout
CREATE OR REPLACE FUNCTION public.is_team_admin_for_layout(user_uuid uuid, layout_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM column_layouts cl
    JOIN team_members tm ON tm.team_id = cl.team_id
    WHERE cl.id = layout_uuid
      AND tm.user_id = user_uuid
      AND tm.role = 'admin'
  );
$$;

-- Add RLS policy to allow team admins to update is_default on layouts
CREATE POLICY "Team admins can set default layout"
ON column_layouts
FOR UPDATE
USING (is_team_admin_for_layout(auth.uid(), id))
WITH CHECK (is_team_admin_for_layout(auth.uid(), id));

-- Function to ensure only one default layout per team
CREATE OR REPLACE FUNCTION public.ensure_single_default_layout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If this layout is being set as default
  IF NEW.is_default = true AND NEW.team_id IS NOT NULL THEN
    -- Unset any other default layouts for this team
    UPDATE column_layouts
    SET is_default = false
    WHERE team_id = NEW.team_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for single default layout
DROP TRIGGER IF EXISTS ensure_single_default_layout_trigger ON column_layouts;
CREATE TRIGGER ensure_single_default_layout_trigger
BEFORE INSERT OR UPDATE ON column_layouts
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_layout();

-- Function to get default layout for a team
CREATE OR REPLACE FUNCTION public.get_team_default_layout(team_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  columns jsonb,
  user_id uuid,
  team_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, name, columns, user_id, team_id, created_at, updated_at
  FROM column_layouts
  WHERE team_id = team_uuid
    AND is_default = true
  LIMIT 1;
$$;