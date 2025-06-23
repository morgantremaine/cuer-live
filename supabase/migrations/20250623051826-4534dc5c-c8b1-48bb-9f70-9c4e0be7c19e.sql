
-- Fix the team_invitations RLS policy to use profiles table instead of auth.users
-- This will resolve the "permission denied for table users" error

-- Create a security definer function to get user email from profiles
CREATE OR REPLACE FUNCTION public.get_user_email_safe(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM profiles WHERE id = user_uuid;
$$;

-- Drop and recreate the problematic invitation policy
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.team_invitations;

-- Create new policy using profiles table instead of auth.users
CREATE POLICY "Users can view relevant invitations"
  ON public.team_invitations
  FOR SELECT
  USING (
    email = public.get_user_email_safe(auth.uid())
    OR public.is_team_admin_safe(auth.uid(), team_id)
  );
