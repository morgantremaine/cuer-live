-- Improve realtime fidelity for conflict detection
-- Set REPLICA IDENTITY FULL to ensure complete row data in realtime updates

-- Set REPLICA IDENTITY FULL on rundowns table for complete update payloads
ALTER TABLE public.rundowns REPLICA IDENTITY FULL;

-- Set REPLICA IDENTITY FULL on blueprints table for complete update payloads  
ALTER TABLE public.blueprints REPLICA IDENTITY FULL;