-- Remove the problematic custom "Elapsed" column that conflicts with the built-in elapsedTime column
DELETE FROM team_custom_columns 
WHERE id = '575a1519-d75b-4a7f-86ce-68a33c0ae05d' 
  AND column_name = 'Elapsed' 
  AND column_key = 'elapsed';