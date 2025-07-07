-- Remove the incomplete user column preference record that's missing elapsedTime and notes columns
-- Keep only the complete record with all 12 columns
DELETE FROM user_column_preferences 
WHERE id = 'e5223886-1c83-405d-8ad8-77a43a2af2ca' 
  AND rundown_id = 'e0d80b9d-5cf9-419d-bdb9-ae05e6e33dc8'
  AND jsonb_array_length(column_layout) = 9;