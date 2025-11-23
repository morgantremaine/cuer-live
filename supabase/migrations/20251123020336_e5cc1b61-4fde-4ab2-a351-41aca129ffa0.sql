-- Transfer admin role from morgantremaine@me.com to mtremaine@wearecinematic.com for GGL team

-- Step 1: Promote mtremaine@wearecinematic.com to admin
UPDATE team_members 
SET role = 'admin' 
WHERE team_id = '5d956992-360e-432a-8ebf-6a00b4504023' 
  AND user_id = 'd71c04e6-5367-4da7-8252-0207d9877f8d';

-- Step 2: Update organization owner
UPDATE teams 
SET organization_owner_id = 'd71c04e6-5367-4da7-8252-0207d9877f8d',
    updated_at = now()
WHERE id = '5d956992-360e-432a-8ebf-6a00b4504023';

-- Step 3: Demote morgantremaine@me.com to member
UPDATE team_members 
SET role = 'member' 
WHERE team_id = '5d956992-360e-432a-8ebf-6a00b4504023' 
  AND user_id = 'de9905f0-27d2-49e8-83b3-0c6cfe70389e';