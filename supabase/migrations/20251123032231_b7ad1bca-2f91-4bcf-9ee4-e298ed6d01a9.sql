-- Add 'showcaller' role to the role constraint
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check 
  CHECK (role IN ('admin', 'manager', 'member', 'showcaller', 'teleprompter'));