
-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table to handle many-to-many relationship
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Add team_id and visibility columns to rundowns table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rundowns' AND column_name = 'team_id') THEN
    ALTER TABLE rundowns ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rundowns' AND column_name = 'visibility') THEN
    ALTER TABLE rundowns ADD COLUMN visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'team'));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_rundowns_team_id ON rundowns(team_id);
CREATE INDEX IF NOT EXISTS idx_rundowns_visibility ON rundowns(visibility);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners and admins can update teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can view invitations for their teams" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;

-- RLS policies for teams
CREATE POLICY "Users can view teams they belong to" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Team owners and admins can update teams" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS policies for team_members
CREATE POLICY "Users can view team members of their teams" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage team members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS policies for team_invitations
CREATE POLICY "Users can view invitations for their teams" ON team_invitations
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Update rundowns RLS policy to include team access
DROP POLICY IF EXISTS "Users can only see their own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can see their own rundowns and team rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can insert their own rundowns" ON rundowns;
DROP POLICY IF EXISTS "Users can update their own rundowns and team rundowns they belong to" ON rundowns;
DROP POLICY IF EXISTS "Users can delete their own rundowns" ON rundowns;

CREATE POLICY "Users can see their own rundowns and team rundowns" ON rundowns
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (visibility = 'team' AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

-- Update rundowns policies for insert/update/delete
CREATE POLICY "Users can insert their own rundowns" ON rundowns
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rundowns and team rundowns they belong to" ON rundowns
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    (visibility = 'team' AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their own rundowns" ON rundowns
  FOR DELETE USING (user_id = auth.uid());
