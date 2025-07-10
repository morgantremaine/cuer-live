-- Clean up duplicate blueprint records
-- Keep only the most recent blueprint for each rundown_id + team_id combination
-- and for each rundown_id + user_id combination (where team_id is null)

-- For team blueprints - delete older duplicates, keep the most recent
WITH ranked_team_blueprints AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY rundown_id, team_id 
           ORDER BY updated_at DESC, created_at DESC
         ) as rn
  FROM blueprints 
  WHERE team_id IS NOT NULL
),
team_duplicates AS (
  SELECT id FROM ranked_team_blueprints WHERE rn > 1
)
DELETE FROM blueprints 
WHERE id IN (SELECT id FROM team_duplicates);

-- For user blueprints (team_id is null) - delete older duplicates, keep the most recent
WITH ranked_user_blueprints AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY rundown_id, user_id 
           ORDER BY updated_at DESC, created_at DESC
         ) as rn
  FROM blueprints 
  WHERE team_id IS NULL
),
user_duplicates AS (
  SELECT id FROM ranked_user_blueprints WHERE rn > 1
)
DELETE FROM blueprints 
WHERE id IN (SELECT id FROM user_duplicates);