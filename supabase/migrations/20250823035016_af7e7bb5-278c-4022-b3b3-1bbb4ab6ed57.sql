-- Clean up all references to the user ID first
DELETE FROM column_layouts WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM user_column_preferences WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM blueprints WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM rundowns WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM team_members WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM profiles WHERE id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM showcaller_sessions WHERE controller_user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM team_invitations WHERE invited_by = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';

-- Now try to delete from auth tables
DELETE FROM auth.identities WHERE user_id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';
DELETE FROM auth.users WHERE id = '668d75c5-3702-4b4d-bbe0-b34aa3a1fe69';