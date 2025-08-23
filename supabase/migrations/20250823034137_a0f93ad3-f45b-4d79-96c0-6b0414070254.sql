-- Clean up test data for cuertest@gmail.com

-- 1. Delete any pending invitations for this email
DELETE FROM team_invitations WHERE email = 'cuertest@gmail.com';

-- 2. Remove any team memberships (if they exist)
DELETE FROM team_members WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'cuertest@gmail.com'
);

-- 3. Remove any user profiles for this email
DELETE FROM profiles WHERE email = 'cuertest@gmail.com';

-- 4. Clean up any auth.users entries for this email (this will cascade)
-- Note: This requires service role permissions, so we'll handle it separately if needed