-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function 1: Clean up old backups (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rundown_recovery_backup
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  RAISE LOG 'Cleaned up old rundown backups';
END;
$$;

-- Function 2: Clean up old revisions (keep last 50 per rundown)
CREATE OR REPLACE FUNCTION public.cleanup_old_revisions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rundown_revisions
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY rundown_id ORDER BY created_at DESC) as rn
      FROM public.rundown_revisions
    ) t
    WHERE rn <= 50
  );
  
  RAISE LOG 'Cleaned up old rundown revisions';
END;
$$;

-- Schedule all cleanup jobs to run daily at 2 AM UTC
-- First, clear any existing schedules with the same name
SELECT cron.unschedule('cleanup-operations') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-operations');
SELECT cron.unschedule('cleanup-presence') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-presence');
SELECT cron.unschedule('cleanup-backups') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-backups');
SELECT cron.unschedule('cleanup-revisions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-revisions');
SELECT cron.unschedule('cleanup-inactive-sessions') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-inactive-sessions');

-- Schedule the jobs
SELECT cron.schedule('cleanup-operations', '0 2 * * *', 'SELECT public.cleanup_old_operations()');
SELECT cron.schedule('cleanup-presence', '0 2 * * *', 'SELECT public.cleanup_old_presence()');
SELECT cron.schedule('cleanup-backups', '0 2 * * *', 'SELECT public.cleanup_old_backups()');
SELECT cron.schedule('cleanup-revisions', '0 2 * * *', 'SELECT public.cleanup_old_revisions()');
SELECT cron.schedule('cleanup-inactive-sessions', '0 2 * * *', 'SELECT public.cleanup_inactive_showcaller_sessions()');

-- Run immediate cleanup to clear historical data
SELECT public.cleanup_old_backups();
SELECT public.cleanup_old_revisions();
SELECT public.cleanup_old_operations();
SELECT public.cleanup_old_presence();
SELECT public.cleanup_inactive_showcaller_sessions();