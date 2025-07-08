-- Add soft deletion and admin-only deletion for team custom columns
ALTER TABLE public.team_custom_columns 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Update RLS policy for viewing to exclude deleted columns
DROP POLICY "Team members can view team custom columns" ON public.team_custom_columns;
CREATE POLICY "Team members can view active team custom columns" 
ON public.team_custom_columns 
FOR SELECT 
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_custom_columns.team_id 
    AND team_members.user_id = auth.uid()
  )
);

-- Update delete policy to only allow team admins and implement soft deletion
DROP POLICY "Users can delete their own team custom columns" ON public.team_custom_columns;
CREATE POLICY "Team admins can soft delete team custom columns" 
ON public.team_custom_columns 
FOR UPDATE 
USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.team_id = team_custom_columns.team_id 
    AND team_members.user_id = auth.uid() 
    AND team_members.role = 'admin'
  )
)
WITH CHECK (
  -- Only allow setting deleted_at, not changing other fields during deletion
  (deleted_at IS NOT NULL AND team_id = team_id AND column_key = column_key AND column_name = column_name AND created_by = created_by)
  OR 
  -- Or allow normal updates for non-deletion operations by original creator
  (deleted_at IS NULL AND created_by = auth.uid())
);

-- Create function to safely soft delete team columns with usage check
CREATE OR REPLACE FUNCTION public.soft_delete_team_column(column_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  column_record RECORD;
  usage_count INTEGER;
  result jsonb;
BEGIN
  -- Get the column record
  SELECT * INTO column_record
  FROM team_custom_columns
  WHERE id = column_uuid AND deleted_at IS NULL;
  
  IF column_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Column not found or already deleted');
  END IF;
  
  -- Check if current user is team admin
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = column_record.team_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'Only team admins can delete team columns');
  END IF;
  
  -- Check usage in user column preferences (this is approximate)
  SELECT COUNT(*) INTO usage_count
  FROM user_column_preferences ucp
  WHERE jsonb_path_exists(
    ucp.column_layout, 
    '$[*] ? (@.key == $key)',
    jsonb_build_object('key', column_record.column_key)
  );
  
  -- Soft delete the column
  UPDATE team_custom_columns 
  SET deleted_at = now(), updated_at = now()
  WHERE id = column_uuid;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Column deleted successfully',
    'usage_found', usage_count,
    'warning', CASE 
      WHEN usage_count > 0 THEN 'This column was being used in ' || usage_count || ' user layouts. It will no longer appear but data is preserved.'
      ELSE NULL
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Failed to delete column: ' || SQLERRM);
END;
$$;

-- Update the get_team_custom_columns function to exclude deleted columns
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
  AND tcc.deleted_at IS NULL
  ORDER BY tcc.created_at;
$$;