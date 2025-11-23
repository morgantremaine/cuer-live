-- Convert all existing team-bound layouts to personal layouts
UPDATE column_layouts 
SET team_id = NULL
WHERE team_id IS NOT NULL;