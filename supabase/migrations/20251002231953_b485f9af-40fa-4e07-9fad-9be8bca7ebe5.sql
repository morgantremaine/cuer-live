-- Ensure teams table has full replica identity for realtime
ALTER TABLE teams REPLICA IDENTITY FULL;