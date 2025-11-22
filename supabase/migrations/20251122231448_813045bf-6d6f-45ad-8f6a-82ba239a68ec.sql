-- Update morgan@cuer.live to have 25 team members for Enterprise tier
UPDATE subscribers
SET 
  max_team_members = 25,
  updated_at = now()
WHERE email = 'morgan@cuer.live';