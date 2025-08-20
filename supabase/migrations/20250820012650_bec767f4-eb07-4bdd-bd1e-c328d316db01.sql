-- Add last_updated_by column to track who made the last edit to a rundown
ALTER TABLE rundowns 
ADD COLUMN last_updated_by uuid REFERENCES auth.users(id);

-- Create index for better performance on last_updated_by queries
CREATE INDEX idx_rundowns_last_updated_by ON rundowns(last_updated_by);

-- Update existing rundowns to set last_updated_by to the creator (user_id) as default
UPDATE rundowns 
SET last_updated_by = user_id 
WHERE last_updated_by IS NULL;