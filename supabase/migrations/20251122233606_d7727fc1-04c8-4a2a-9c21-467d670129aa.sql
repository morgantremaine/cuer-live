-- Add organization_owner_id to teams table (nullable)
ALTER TABLE teams 
ADD COLUMN organization_owner_id UUID;

-- Index for performance
CREATE INDEX idx_teams_organization_owner 
ON teams(organization_owner_id);

-- Backfill existing teams with organization owner (only for valid users)
UPDATE teams t
SET organization_owner_id = (
  SELECT tm.user_id 
  FROM team_members tm
  JOIN auth.users au ON au.id = tm.user_id
  WHERE tm.team_id = t.id 
  AND tm.role = 'admin' 
  LIMIT 1
)
WHERE organization_owner_id IS NULL;

-- Update create_new_team function to set organization owner
CREATE OR REPLACE FUNCTION public.create_new_team(user_uuid uuid, team_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_team_id uuid;
BEGIN
  INSERT INTO teams (name, organization_owner_id)
  VALUES (trim(team_name), user_uuid)
  RETURNING id INTO new_team_id;
  
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (user_uuid, new_team_id, 'admin');
  
  RETURN new_team_id;
END;
$$;

-- Function to get all organization members
CREATE OR REPLACE FUNCTION public.get_organization_members(org_owner_uuid uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  profile_picture_url text,
  team_count bigint,
  teams_list text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.profile_picture_url,
    COUNT(DISTINCT tm.team_id) as team_count,
    ARRAY_AGG(DISTINCT t.name ORDER BY t.name) as teams_list
  FROM profiles p
  JOIN team_members tm ON tm.user_id = p.id
  JOIN teams t ON t.id = tm.team_id
  WHERE t.organization_owner_id = org_owner_uuid
  GROUP BY p.id, p.email, p.full_name, p.profile_picture_url
  ORDER BY p.full_name, p.email;
END;
$$;

-- Function to add an organization member to a team
CREATE OR REPLACE FUNCTION public.add_org_member_to_team(
  target_user_id uuid, 
  target_team_id uuid,
  adding_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_owner_id uuid;
  adding_user_role text;
BEGIN
  -- Get the team's organization owner
  SELECT organization_owner_id INTO org_owner_id
  FROM teams WHERE id = target_team_id;
  
  -- Verify the adding user is admin/manager
  SELECT role INTO adding_user_role
  FROM team_members 
  WHERE user_id = adding_user_id AND team_id = target_team_id;
  
  IF adding_user_role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Verify target user is part of the organization
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.user_id = target_user_id 
    AND t.organization_owner_id = org_owner_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not in organization');
  END IF;
  
  -- Add to team if not already a member
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (target_user_id, target_team_id, 'member')
  ON CONFLICT (user_id, team_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
END;
$$;