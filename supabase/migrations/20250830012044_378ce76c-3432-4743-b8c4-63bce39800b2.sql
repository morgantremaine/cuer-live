-- Remove show_date column from rundowns table since we reverted the feature
ALTER TABLE rundowns DROP COLUMN IF EXISTS show_date;

-- Also remove show_date from rundown_recovery_backup table  
ALTER TABLE rundown_recovery_backup DROP COLUMN IF EXISTS show_date;

-- Remove the index that was created for show_date
DROP INDEX IF EXISTS idx_rundowns_show_date;