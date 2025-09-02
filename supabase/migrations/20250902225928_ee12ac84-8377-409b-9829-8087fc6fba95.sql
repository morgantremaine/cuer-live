-- Fix log_rundown_changes to insert with explicit columns matching backup table
CREATE OR REPLACE FUNCTION public.log_rundown_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id = '93407565-888c-42e1-93a9-9757e24c43ae' THEN
    INSERT INTO public.rundown_recovery_backup (
      folder_id,
      created_at,
      items,
      user_id,
      id,
      undo_history,
      showcaller_state,
      external_notes,
      start_time,
      icon,
      logo_url,
      columns,
      archived,
      team_id,
      updated_at,
      last_updated_by,
      timezone,
      title,
      visibility
    ) VALUES (
      NEW.folder_id,
      NEW.created_at,
      NEW.items,
      NEW.user_id,
      NEW.id,
      NEW.undo_history,
      NEW.showcaller_state,
      NEW.external_notes,
      NEW.start_time,
      NEW.icon,
      NEW.logo_url,
      NEW.columns,
      NEW.archived,
      NEW.team_id,
      NEW.updated_at,
      NEW.last_updated_by,
      NEW.timezone,
      NEW.title,
      NEW.visibility
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;