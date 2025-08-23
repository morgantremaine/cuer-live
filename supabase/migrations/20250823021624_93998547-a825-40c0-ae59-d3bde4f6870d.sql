-- Clear the problematic invitation for steve@stevemeyer.tv
DELETE FROM team_invitations WHERE email = 'steve@stevemeyer.tv';

-- Add detailed logging to accept_team_invitation_safe for better debugging
CREATE OR REPLACE FUNCTION public.accept_team_invitation_safe(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  current_user_id uuid;
  current_user_email text;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Log invitation acceptance attempt
  RAISE LOG 'Invitation acceptance attempt: token=%, user_id=%', invitation_token, current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE LOG 'Invitation acceptance failed: User not authenticated';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get and validate invitation
  SELECT * INTO invitation_record
  FROM team_invitations
  WHERE token = invitation_token
    AND accepted = false
    AND expires_at > now();

  IF invitation_record IS NULL THEN
    RAISE LOG 'Invitation acceptance failed: Invalid or expired token=%', invitation_token;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  RAISE LOG 'Found valid invitation: id=%, email=%, team_id=%', invitation_record.id, invitation_record.email, invitation_record.team_id;

  -- Determine the current user's email
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  IF current_user_email IS NULL THEN
    -- Fallback to profiles if needed
    SELECT email INTO current_user_email
    FROM profiles
    WHERE id = current_user_id;
  END IF;

  RAISE LOG 'User email check: invitation_email=%, current_user_email=%', invitation_record.email, current_user_email;

  -- Enforce email match with invitation
  IF lower(coalesce(current_user_email, '')) <> lower(invitation_record.email) THEN
    RAISE LOG 'Invitation acceptance failed: Email mismatch - invitation for % but user is %', invitation_record.email, current_user_email;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This invitation is for ' || invitation_record.email || ' but you are signed in as ' || coalesce(current_user_email, 'unknown') || '. Please sign out and use the correct account.'
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

  RAISE LOG 'Profile ensured for user: %', current_user_id;

  -- If user already a member, mark invitation accepted (emails match) and return
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = current_user_id 
      AND team_id = invitation_record.team_id
  ) THEN
    UPDATE team_invitations
    SET accepted = true
    WHERE id = invitation_record.id;
    
    RAISE LOG 'User already member of team %, marking invitation accepted', invitation_record.team_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'You are already a member of this team'
    );
  END IF;

  -- Add user to team
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (current_user_id, invitation_record.team_id, 'member');

  RAISE LOG 'Added user % to team % as member', current_user_id, invitation_record.team_id;

  -- Mark invitation as accepted
  UPDATE team_invitations
  SET accepted = true
  WHERE id = invitation_record.id;

  RAISE LOG 'Invitation acceptance successful: user=%, team=%', current_user_id, invitation_record.team_id;

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
    
    RAISE LOG 'Race condition handled for invitation %, marking accepted', invitation_record.id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'You are already a member of this team'
    );
  WHEN OTHERS THEN
    RAISE LOG 'Invitation acceptance error: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to join team: ' || SQLERRM
    );
END;
$function$;