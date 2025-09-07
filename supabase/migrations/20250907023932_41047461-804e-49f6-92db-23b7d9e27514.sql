-- Add missing foreign key constraint between app_notification_dismissals and app_notifications
ALTER TABLE app_notification_dismissals 
ADD CONSTRAINT fk_app_notification_dismissals_notification_id 
FOREIGN KEY (notification_id) REFERENCES app_notifications(id) ON DELETE CASCADE;

-- Also add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_app_notification_dismissals_notification_id 
ON app_notification_dismissals(notification_id);

-- Add index on user_id for better performance when filtering by user
CREATE INDEX IF NOT EXISTS idx_app_notification_dismissals_user_id 
ON app_notification_dismissals(user_id);