
-- Fix foreign key constraints to cascade deletions properly
ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update profiles table to cascade delete as well
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create function to cleanup orphaned team memberships
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_memberships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Remove team memberships for users that no longer exist
  DELETE FROM team_members 
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  
  -- Clean up any orphaned profiles
  DELETE FROM profiles 
  WHERE id NOT IN (SELECT id FROM auth.users);
END;
$function$;

-- Create function to properly handle user deletion with team cleanup
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- First remove from teams
  DELETE FROM team_members WHERE user_id = user_uuid;
  
  -- Remove profile
  DELETE FROM profiles WHERE id = user_uuid;
  
  -- Mark any pending invitations for this email as expired
  UPDATE team_invitations 
  SET expires_at = now() - interval '1 day'
  WHERE email = (SELECT email FROM auth.users WHERE id = user_uuid)
  AND accepted = false;
END;
$function$;

-- Improve the cleanup_accepted_invitations function
CREATE OR REPLACE FUNCTION public.cleanup_accepted_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Mark invitations as accepted if the user is already a team member
  UPDATE team_invitations 
  SET accepted = true
  WHERE accepted = false
  AND EXISTS (
    SELECT 1 FROM team_members tm
    JOIN profiles p ON p.id = tm.user_id
    WHERE p.email = team_invitations.email
    AND tm.team_id = team_invitations.team_id
  );
  
  -- Clean up expired invitations
  DELETE FROM team_invitations 
  WHERE expires_at < now();
  
  -- Clean up orphaned memberships
  PERFORM cleanup_orphaned_memberships();
END;
$function$;
