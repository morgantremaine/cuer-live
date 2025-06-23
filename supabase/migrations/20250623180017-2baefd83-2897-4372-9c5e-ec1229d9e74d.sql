
-- Create a security definer function to safely get inviter profile for invitation display
CREATE OR REPLACE FUNCTION public.get_inviter_profile_for_invitation(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  inviter_profile RECORD;
BEGIN
  -- First verify the invitation token is valid
  SELECT * INTO invitation_record
  FROM team_invitations
  WHERE token = invitation_token
    AND accepted = false
    AND expires_at > now();

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Get the inviter's profile
  SELECT full_name, email INTO inviter_profile
  FROM profiles
  WHERE id = invitation_record.invited_by;

  IF inviter_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Inviter profile not found');
  END IF;

  RETURN jsonb_build_object(
    'full_name', inviter_profile.full_name,
    'email', inviter_profile.email
  );
END;
$$;

-- Also create a function to get complete invitation details including team and inviter info
CREATE OR REPLACE FUNCTION public.get_invitation_details_safe(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'invitation', jsonb_build_object(
      'id', i.id,
      'email', i.email,
      'team_id', i.team_id,
      'invited_by', i.invited_by,
      'created_at', i.created_at,
      'expires_at', i.expires_at,
      'token', i.token
    ),
    'team', jsonb_build_object(
      'id', t.id,
      'name', t.name
    ),
    'inviter', jsonb_build_object(
      'full_name', p.full_name,
      'email', p.email
    )
  ) INTO result
  FROM team_invitations i
  JOIN teams t ON i.team_id = t.id
  LEFT JOIN profiles p ON i.invited_by = p.id
  WHERE i.token = invitation_token
    AND i.accepted = false
    AND i.expires_at > now();

  IF result IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invitation');
  END IF;

  RETURN result;
END;
$$;
