-- Remove user blueprint that conflicts with team blueprint
-- for rundown 70e33b7d-6195-43f0-821a-a58b5ed0760a
DELETE FROM blueprints 
WHERE rundown_id = '70e33b7d-6195-43f0-821a-a58b5ed0760a' 
  AND team_id IS NULL;