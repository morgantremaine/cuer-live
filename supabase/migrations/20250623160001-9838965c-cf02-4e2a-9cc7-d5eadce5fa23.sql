
-- Clean up any duplicate or orphaned team memberships
DELETE FROM public.team_members 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean up any orphaned profiles
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Ensure we have proper unique constraint on team_members
DROP INDEX IF EXISTS team_members_user_team_unique;
CREATE UNIQUE INDEX team_members_user_team_unique 
ON public.team_members (user_id, team_id);

-- Clean up any accepted invitations that still show as pending
UPDATE public.team_invitations 
SET accepted = true 
WHERE email IN (
  SELECT p.email 
  FROM profiles p 
  JOIN team_members tm ON p.id = tm.user_id 
  WHERE tm.team_id = team_invitations.team_id
) AND accepted = false;

-- Create a function to safely accept invitations with proper error handling
CREATE OR REPLACE FUNCTION public.accept_team_invitation(
  invitation_token text,
  accepting_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  existing_membership_record RECORD;
  result jsonb;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM team_invitations
  WHERE token = invitation_token
    AND accepted = false
    AND expires_at > now();

  IF invitation_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Check if user already exists in the team
  SELECT * INTO existing_membership_record
  FROM team_members
  WHERE user_id = accepting_user_id
    AND team_id = invitation_record.team_id;

  IF existing_membership_record IS NOT NULL THEN
    -- User is already a member, just mark invitation as accepted
    UPDATE team_invitations
    SET accepted = true
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'You are already a member of this team'
    );
  END IF;

  -- Add user to team
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (accepting_user_id, invitation_record.team_id, 'member');

  -- Mark invitation as accepted
  UPDATE team_invitations
  SET accepted = true
  WHERE id = invitation_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined the team'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - user was added between our check and insert
    UPDATE team_invitations
    SET accepted = true
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'You are already a member of this team'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to join team: ' || SQLERRM
    );
END;
$$;
