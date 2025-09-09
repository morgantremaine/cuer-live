-- Enable real-time for rundown_operations table
-- This allows clients to receive real-time notifications when operations are inserted

-- Set replica identity to FULL to ensure complete row data is captured during updates
ALTER TABLE rundown_operations REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication to activate real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE rundown_operations;