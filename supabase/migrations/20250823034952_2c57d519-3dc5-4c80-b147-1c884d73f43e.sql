-- Delete auth.users entry for cuertest@gmail.com
-- This requires service role permissions but should work in migration

DELETE FROM auth.users WHERE email = 'cuertest@gmail.com';

-- Also clean up any related auth data
DELETE FROM auth.identities WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';