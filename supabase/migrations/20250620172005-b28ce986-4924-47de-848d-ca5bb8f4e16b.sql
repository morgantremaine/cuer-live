
-- Fix Function Search Path Mutable warnings by adding SET search_path = 'public' 
-- to all affected database functions

-- Update is_team_admin function
CREATE OR REPLACE FUNCTION public.is_team_admin(user_id uuid, team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.user_id = $1
    AND team_members.team_id = $2
    AND team_members.role = 'admin'
  );
$function$;

-- Update update_rundown_presence function
CREATE OR REPLACE FUNCTION public.update_rundown_presence(rundown_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.rundown_presence (rundown_id, user_id, last_seen)
  VALUES (rundown_uuid, auth.uid(), NOW())
  ON CONFLICT (rundown_id, user_id)
  DO UPDATE SET last_seen = NOW();
END;
$function$;

-- Update cleanup_old_presence function
CREATE OR REPLACE FUNCTION public.cleanup_old_presence()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.rundown_presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$function$;

-- Update cleanup_orphaned_memberships function
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_memberships()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Update get_user_teams function
CREATE OR REPLACE FUNCTION public.get_user_teams(user_uuid uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT ARRAY(
    SELECT team_id 
    FROM team_members 
    WHERE user_id = user_uuid
  );
$function$;

-- Update is_team_admin_check function
CREATE OR REPLACE FUNCTION public.is_team_admin_check(user_uuid uuid, team_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid
    AND team_id = team_uuid
    AND role = 'admin'
  );
$function$;

-- Update delete_user_completely function
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Update cleanup_accepted_invitations function
CREATE OR REPLACE FUNCTION public.cleanup_accepted_invitations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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
