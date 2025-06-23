
-- Step 1: Remove the problematic foreign key constraint from team_members
DO $$
BEGIN
    -- Check if the foreign key constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'team_members_user_id_fkey' 
        AND table_name = 'team_members'
    ) THEN
        ALTER TABLE public.team_members DROP CONSTRAINT team_members_user_id_fkey;
    END IF;
END $$;

-- Step 2: Clean up orphaned team memberships (users that don't exist in profiles)
DELETE FROM public.team_members 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Step 3: Clean up orphaned profiles (users that don't exist in auth.users)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 4: Ensure the user who's trying to join has a profile
-- This will be handled by the trigger, but let's make sure it exists
DO $$
BEGIN
    -- The handle_new_user trigger should have created this, but let's ensure it exists
    INSERT INTO public.profiles (id, email, full_name)
    SELECT 
        au.id, 
        au.email, 
        COALESCE(au.raw_user_meta_data ->> 'full_name', '')
    FROM auth.users au
    WHERE au.id NOT IN (SELECT id FROM public.profiles)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
END $$;

-- Step 5: Update the accept_team_invitation function to be more robust
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
  -- Ensure the user has a profile first
  INSERT INTO public.profiles (id, email, full_name)
  SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data ->> 'full_name', '')
  FROM auth.users au
  WHERE au.id = accepting_user_id
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

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

  -- Add user to team (no foreign key constraint to worry about now)
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
