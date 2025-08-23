-- Clear all invitation and membership data for cuertest@gmail.com to enable fresh testing

-- Remove any team memberships for this user
DELETE FROM team_members 
WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';

-- Remove all invitation records for this email
DELETE FROM team_invitations 
WHERE email = 'cuertest@gmail.com';

-- Remove the profile (this will cascade to clean up other references)
DELETE FROM profiles 
WHERE email = 'cuertest@gmail.com';