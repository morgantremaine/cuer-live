
-- Create a function to validate invitation tokens
CREATE OR REPLACE FUNCTION public.validate_invitation_token(
  token_param text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  team_record RECORD;
  inviter_record RECORD;
BEGIN
  -- Get the invitation with team and inviter details
  SELECT i.*, t.name as team_name, p.full_name as inviter_name, p.email as inviter_email
  INTO invitation_record
  FROM team_invitations i
  JOIN teams t ON i.team_id = t.id
  LEFT JOIN profiles p ON i.invited_by = p.id
  WHERE i.token = token_param
    AND i.accepted = false
    AND i.expires_at > now();

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired invitation token'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'email', invitation_record.email,
      'team_id', invitation_record.team_id,
      'invited_by', invitation_record.invited_by,
      'created_at', invitation_record.created_at,
      'expires_at', invitation_record.expires_at,
      'token', invitation_record.token
    ),
    'team', jsonb_build_object(
      'id', invitation_record.team_id,
      'name', invitation_record.team_name
    ),
    'inviter', jsonb_build_object(
      'full_name', invitation_record.inviter_name,
      'email', invitation_record.inviter_email
    )
  );
END;
$$;
