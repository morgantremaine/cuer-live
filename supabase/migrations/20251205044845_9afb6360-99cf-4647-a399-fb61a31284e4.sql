-- Create optimized RPC function to get full team context in a single query
CREATE OR REPLACE FUNCTION public.get_full_team_context(user_uuid uuid, team_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  team_record RECORD;
  user_role text;
BEGIN
  -- Get user's role in the team
  SELECT role INTO user_role
  FROM team_members
  WHERE user_id = user_uuid AND team_id = team_uuid;
  
  -- If user is not a member of this team, return null
  IF user_role IS NULL THEN
    RETURN jsonb_build_object('error', 'Not a team member');
  END IF;
  
  -- Get the team details
  SELECT * INTO team_record
  FROM teams
  WHERE id = team_uuid;
  
  IF team_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Team not found');
  END IF;
  
  -- Build the complete result in one query
  SELECT jsonb_build_object(
    'team', jsonb_build_object(
      'id', team_record.id,
      'name', team_record.name,
      'organization_owner_id', team_record.organization_owner_id,
      'created_at', team_record.created_at,
      'updated_at', team_record.updated_at
    ),
    'userRole', user_role,
    'allUserTeams', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'team_id', tm.team_id,
        'role', tm.role,
        'joined_at', tm.joined_at,
        'team_name', t.name
      )), '[]'::jsonb)
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = user_uuid
    ),
    'teamMembers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', tm.id,
        'user_id', tm.user_id,
        'team_id', tm.team_id,
        'role', tm.role,
        'joined_at', tm.joined_at,
        'email', p.email,
        'full_name', p.full_name,
        'profile_picture_url', p.profile_picture_url
      )), '[]'::jsonb)
      FROM team_members tm
      LEFT JOIN profiles p ON p.id = tm.user_id
      WHERE tm.team_id = team_uuid
    ),
    'pendingInvitations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ti.id,
        'email', ti.email,
        'role', ti.role,
        'created_at', ti.created_at,
        'expires_at', ti.expires_at,
        'invited_by', ti.invited_by,
        'inviter_name', p.full_name,
        'inviter_email', p.email
      )), '[]'::jsonb)
      FROM team_invitations ti
      LEFT JOIN profiles p ON p.id = ti.invited_by
      WHERE ti.team_id = team_uuid
        AND ti.accepted = false
        AND ti.expires_at > now()
    ),
    'organizationMembers', CASE 
      WHEN team_record.organization_owner_id IS NOT NULL THEN (
        SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
          'user_id', tm.user_id,
          'email', p.email,
          'full_name', p.full_name,
          'profile_picture_url', p.profile_picture_url
        )), '[]'::jsonb)
        FROM team_members tm
        JOIN profiles p ON p.id = tm.user_id
        JOIN teams t ON t.id = tm.team_id
        WHERE t.organization_owner_id = team_record.organization_owner_id
      )
      ELSE '[]'::jsonb
    END
  ) INTO result;
  
  RETURN result;
END;
$$;