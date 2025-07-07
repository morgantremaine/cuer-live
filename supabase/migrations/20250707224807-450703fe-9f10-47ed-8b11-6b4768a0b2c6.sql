-- Remove the incomplete user column preference record for rundown 4ec67f28-c8c9-41ba-9f04-845aa1412208
-- Keep only the complete record with all 12 columns (including elapsedTime)
DELETE FROM user_column_preferences 
WHERE id = '95586198-c70a-48ba-8065-e5c48c9ead97' 
  AND rundown_id = '4ec67f28-c8c9-41ba-9f04-845aa1412208'
  AND jsonb_array_length(column_layout) = 9;