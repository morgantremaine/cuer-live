-- Clean up duplicate policies that may cause confusion
-- Keep only the most restrictive and properly named policies

-- Clean up duplicate profile policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Clean up duplicate rundown policies
DROP POLICY IF EXISTS "Users can see rundowns" ON public.rundowns;
DROP POLICY IF EXISTS "Allow public update of external_notes for external review rundo" ON public.rundowns;

-- Verify essential security functions exist and are working
-- Check team admin function
SELECT public.is_team_admin_safe('93407565-888c-42e1-93a9-9757e24c43ae', '5d956992-360e-432a-8ebf-6a00b4504023') as is_admin_test;