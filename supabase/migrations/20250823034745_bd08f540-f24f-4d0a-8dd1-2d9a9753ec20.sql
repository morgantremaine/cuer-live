-- Complete cleanup for cuertest@gmail.com
-- This ensures a completely fresh test

-- 1. Clean up any remaining invitations
DELETE FROM team_invitations WHERE email = 'cuertest@gmail.com';

-- 2. Clean up any team memberships 
DELETE FROM team_members WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'cuertest@gmail.com'
);

-- 3. Clean up any profiles
DELETE FROM profiles WHERE email = 'cuertest@gmail.com';

-- 4. Clean up any user column preferences
DELETE FROM user_column_preferences WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'cuertest@gmail.com'
);

-- 5. Clean up any blueprints
DELETE FROM blueprints WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'cuertest@gmail.com'
);

-- 6. Clean up any rundowns
DELETE FROM rundowns WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'cuertest@gmail.com'
);

-- Note: auth.users cleanup would require service role permissions
-- The user may need to manually delete this from the Supabase Auth dashboard if needed