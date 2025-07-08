-- Undo the soft deletion changes and restore original team column deletion
-- Drop policies first to avoid dependency issues

-- Drop the soft deletion function
DROP FUNCTION IF EXISTS public.soft_delete_team_column(uuid);

-- Drop all current policies that depend on deleted_at
DROP POLICY IF EXISTS "Team members can view active team custom columns" ON public.team_custom_columns;
DROP POLICY IF EXISTS "Team admins can soft delete team custom columns" ON public.team_custom_columns;

-- Remove the deleted_at column now that dependencies are gone
ALTER TABLE public.team_custom_columns 
DROP COLUMN IF EXISTS deleted_at;

-- Recreate original viewing policy
CREATE POLICY "Team members can view team custom columns" 
ON public.team_custom_columns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_custom_columns.team_id 
    AND team_members.user_id = auth.uid()
  )
);

-- Create admin-only delete policy (simple hard deletion)
CREATE POLICY "Team admins can delete team custom columns" 
ON public.team_custom_columns 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_custom_columns.team_id 
    AND team_members.user_id = auth.uid() 
    AND team_members.role = 'admin'
  )
);

-- Restore original get_team_custom_columns function (remove deleted_at filter)
CREATE OR REPLACE FUNCTION public.get_team_custom_columns(team_uuid uuid)
RETURNS TABLE(
  id uuid,
  column_key text,
  column_name text,
  created_by uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tcc.id, tcc.column_key, tcc.column_name, tcc.created_by, tcc.created_at
  FROM team_custom_columns tcc
  WHERE tcc.team_id = team_uuid
  ORDER BY tcc.created_at;
$$;