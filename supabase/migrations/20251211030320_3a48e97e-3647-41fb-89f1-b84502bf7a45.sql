-- Complete removal of admin profiles feature

-- Remove the admin policy completely
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;

-- Remove the admin check function
DROP FUNCTION IF EXISTS public.is_admin_user();