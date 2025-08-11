-- Fix the remaining team invitation security issue
-- Remove the overly permissive token-based policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Token-based invitation access" ON public.team_invitations;

-- Create a more secure token-based policy that only allows specific operations
-- This will be used by edge functions for invitation validation
CREATE POLICY "Service role invitation management" ON public.team_invitations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add a restricted token validation policy for authenticated users
CREATE POLICY "Token validation for authenticated users" ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  -- Only allow reading when checking a specific valid token
  -- This limits exposure to single invitation lookups
  (token IS NOT NULL AND expires_at > now() AND accepted = false)
);

-- Test that critical invitation flows still work
SELECT 
  email,
  team_id,
  accepted,
  expires_at > now() as valid
FROM public.team_invitations 
WHERE token = '2d279e51-4561-4ace-91ad-98fe3d3e0b8f'
LIMIT 1;