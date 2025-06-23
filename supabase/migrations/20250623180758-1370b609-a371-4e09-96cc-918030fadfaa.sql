
-- Create the missing accept_team_invitation_safe function
CREATE OR REPLACE FUNCTION public.accept_team_invitation_safe(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  invitation_record RECORD;
  current_user_id uuid;
  result jsonb;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Begin transaction
  BEGIN
    -- Get and validate invitation
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

    -- Ensure user has a profile
    INSERT INTO public.profiles (id, email, full_name)
    SELECT 
      au.id, 
      au.email, 
      COALESCE(au.raw_user_meta_data ->> 'full_name', '')
    FROM auth.users au
    WHERE au.id = current_user_id
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    -- Check if user is already a team member
    IF EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = current_user_id 
      AND team_id = invitation_record.team_id
    ) THEN
      -- Mark invitation as accepted
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
    VALUES (current_user_id, invitation_record.team_id, 'member');

    -- Mark invitation as accepted
    UPDATE team_invitations
    SET accepted = true
    WHERE id = invitation_record.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Successfully joined the team',
      'team_id', invitation_record.team_id
    );

  EXCEPTION
    WHEN unique_violation THEN
      -- Handle race condition
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
END;
$$;
