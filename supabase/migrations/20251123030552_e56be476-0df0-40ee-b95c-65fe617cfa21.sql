-- Drop the old constraint that doesn't include teleprompter
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Add the new constraint with teleprompter included
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check 
  CHECK (role IN ('admin', 'manager', 'member', 'teleprompter'));