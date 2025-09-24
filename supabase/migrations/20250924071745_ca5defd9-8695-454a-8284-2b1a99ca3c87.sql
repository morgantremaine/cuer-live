-- Clean up all team invitations for cuertest@gmail.com
DELETE FROM team_invitations WHERE email = 'cuertest@gmail.com';

-- Clean up any orphaned data that might exist
-- Check for rundowns with non-existent user_ids and clean them up if they belong to test scenarios
DELETE FROM rundowns 
WHERE user_id NOT IN (SELECT id FROM profiles) 
  AND (title LIKE '%test%' OR title LIKE '%demo%' OR team_id IN (
    SELECT DISTINCT team_id FROM team_invitations WHERE email = 'cuertest@gmail.com'
  ));

-- Clean up any orphaned blueprints
DELETE FROM blueprints 
WHERE user_id NOT IN (SELECT id FROM profiles);