
-- Strengthen acceptance to require email match with the invitation
-- Function: public.accept_team_invitation_safe
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
  
  IF current_user_id IS NULL THEN
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

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

  -- Enforce email match with invitation
  IF lower(coalesce(current_user_email, '')) <> lower(invitation_record.email) THEN
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

  -- If user already a member, mark invitation accepted (emails match) and return
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = current_user_id 
      AND team_id = invitation_record.team_id
  ) THEN
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
$function$;

-- Function: public.accept_invitation_secure
CREATE OR REPLACE FUNCTION public.accept_invitation_secure(invitation_token text)
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
  
  IF current_user_id IS NULL THEN
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
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

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

  -- Enforce email match with invitation
  IF lower(coalesce(current_user_email, '')) <> lower(invitation_record.email) THEN
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

  -- If user already a member, mark invitation accepted (emails match) and return
  IF EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = current_user_id 
      AND team_id = invitation_record.team_id
  ) THEN
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
$function$;
