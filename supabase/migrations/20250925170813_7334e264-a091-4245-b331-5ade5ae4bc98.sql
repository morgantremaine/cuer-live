-- Remove Candela's duplicate team memberships from empty teams
-- This will fix the dual admin access issue by eliminating confusion from multiple team memberships

-- Remove membership from team 8c6ec353-a139-467d-8fc5-25d3c0b5d632 (empty team)
DELETE FROM team_members 
WHERE user_id = '7bd94e7b-ecf7-4aba-a233-36fdfbaabf3a' 
AND team_id = '8c6ec353-a139-467d-8fc5-25d3c0b5d632';

-- Remove membership from team f5164679-582a-4828-9baa-3fe2dbf755fe (empty team)  
DELETE FROM team_members 
WHERE user_id = '7bd94e7b-ecf7-4aba-a233-36fdfbaabf3a' 
AND team_id = 'f5164679-582a-4828-9baa-3fe2dbf755fe';

-- Verify Candela remains admin of the main team (513a8cf4-5fa4-4fba-9dfb-de42487ba9b0)
-- This query will show remaining memberships for verification
SELECT tm.team_id, tm.role, t.name as team_name
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = '7bd94e7b-ecf7-4aba-a233-36fdfbaabf3a';