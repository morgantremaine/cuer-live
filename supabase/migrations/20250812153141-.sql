-- Clean up team membership for noreply@cuer.live
DELETE FROM team_members 
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'noreply@cuer.live'
);