-- Create a security definer function to check if user is admin
-- This queries auth.users instead of profiles to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'morgan@cuer.live'
  );
$$;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Recreate the policy using the security definer function
CREATE POLICY "Admin can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin_user());