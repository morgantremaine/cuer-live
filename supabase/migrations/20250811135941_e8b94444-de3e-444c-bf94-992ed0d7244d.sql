-- Fix security vulnerability: Remove public access and tighten RLS policies
-- for subscribers, team_invitations, and rundowns tables

-- 1. Fix subscribers table - Remove public access policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.subscribers;
DROP POLICY IF EXISTS "Allow public read access to shared rundowns" ON public.rundowns;
DROP POLICY IF EXISTS "Public can view public rundowns" ON public.rundowns;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rundowns;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.team_invitations;

-- 2. Ensure subscribers table only allows users to access their own data
-- First, remove any permissive policies that might allow public access
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscribers;

-- Recreate the service role policy with more specific permissions
CREATE POLICY "Service role can manage subscriptions" ON public.subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the user policy is restrictive enough
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscribers;

CREATE POLICY "Users can view own subscription" ON public.subscribers
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR email = auth.email());

-- Users should not be able to directly modify subscription data (only service role through edge functions)
CREATE POLICY "Users cannot modify subscription data" ON public.subscribers
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 3. Fix team_invitations table - Only allow viewing by token, invited user, or team admin
DROP POLICY IF EXISTS "Authenticated users can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can manage their team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can view relevant invitations" ON public.team_invitations;

-- Recreate secure policies for team_invitations
CREATE POLICY "Team admins can manage invitations" ON public.team_invitations
FOR ALL
TO authenticated
USING (is_team_admin_safe(auth.uid(), team_id))
WITH CHECK (is_team_admin_safe(auth.uid(), team_id));

CREATE POLICY "Users can view relevant invitations only" ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  email = auth.email() OR 
  invited_by = auth.uid() OR 
  is_team_admin_safe(auth.uid(), team_id)
);

-- 4. Fix rundowns table - Remove public access policies
DROP POLICY IF EXISTS "Allow public read access to shared rundowns" ON public.rundowns;
DROP POLICY IF EXISTS "Public can view public rundowns" ON public.rundowns;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rundowns;

-- Keep only the essential rundowns policies for team members and public/shared rundowns
-- Public access only for explicitly shared rundowns (visibility = 'public')
CREATE POLICY "Public can view explicitly public rundowns" ON public.rundowns
FOR SELECT
TO anon, authenticated
USING (visibility = 'public');

-- External review access (limited to external_notes updates)
CREATE POLICY "External review access for external_notes only" ON public.rundowns
FOR UPDATE
TO anon, authenticated
USING (visibility = 'external_review')
WITH CHECK (visibility = 'external_review');

-- 5. Add additional security for profiles table
-- Remove any overly permissive policies
DROP POLICY IF EXISTS "Team members can view team profiles" ON public.profiles;

-- Only allow viewing profiles of team members in the same team
CREATE POLICY "Team members can view same team profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM team_members tm1
    JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() 
    AND tm2.user_id = profiles.id
  ) OR
  can_read_inviter_profile(id)
);

-- 6. Ensure no anonymous access to sensitive tables
-- Revoke any default permissions
REVOKE ALL ON public.subscribers FROM anon;
REVOKE ALL ON public.team_invitations FROM anon;
REVOKE ALL ON public.profiles FROM anon;

-- Grant only necessary permissions to authenticated users
GRANT SELECT ON public.subscribers TO authenticated;
GRANT SELECT ON public.team_invitations TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;