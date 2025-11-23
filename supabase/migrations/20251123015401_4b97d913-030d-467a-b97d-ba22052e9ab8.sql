-- Fix get_organization_members function ORDER BY to match DISTINCT cast
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
STABLE SECURITY DEFINER
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
    ARRAY_AGG(DISTINCT t.name::text ORDER BY t.name::text) as teams_list
  FROM profiles p
  JOIN team_members tm ON tm.user_id = p.id
  JOIN teams t ON t.id = tm.team_id
  WHERE t.organization_owner_id = org_owner_uuid
  GROUP BY p.id, p.email, p.full_name, p.profile_picture_url
  ORDER BY p.full_name, p.email;
END;
$$;