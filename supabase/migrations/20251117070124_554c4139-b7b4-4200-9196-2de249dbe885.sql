-- Drop and recreate get_batched_rundown_history with explicit table aliases to fix column ambiguity
DROP FUNCTION IF EXISTS get_batched_rundown_history(text, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_batched_rundown_history(
  target_rundown_id text,
  batch_window_seconds integer DEFAULT 300,
  limit_batches integer DEFAULT 20,
  offset_batches integer DEFAULT 0
)
RETURNS TABLE (
  batch_id text,
  user_id uuid,
  user_name text,
  user_email text,
  profile_picture_url text,
  first_operation timestamp with time zone,
  last_operation timestamp with time zone,
  operation_count bigint,
  operation_types text[],
  summary text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH operation_batches AS (
    SELECT 
      ro.id,
      ro.user_id,
      ro.operation_type,
      ro.operation_data,
      ro.created_at,
      p.full_name,
      p.email,
      p.profile_picture_url,
      FLOOR(EXTRACT(EPOCH FROM ro.created_at) / batch_window_seconds) as batch_group
    FROM rundown_operations ro
    LEFT JOIN profiles p ON ro.user_id = p.id
    WHERE ro.rundown_id = target_rundown_id::uuid
    ORDER BY ro.created_at DESC
  ),
  batched_operations AS (
    SELECT
      ob.batch_group::text || '-' || ob.user_id as batch_id,
      ob.user_id,
      COALESCE(ob.full_name, 'Unknown User') as user_name,
      ob.email as user_email,
      ob.profile_picture_url,
      MIN(ob.created_at) as first_operation,
      MAX(ob.created_at) as last_operation,
      COUNT(*) as operation_count,
      array_agg(DISTINCT ob.operation_type) as operation_types,
      jsonb_agg(
        jsonb_build_object(
          'id', ob.id,
          'operation_type', ob.operation_type,
          'operation_data', ob.operation_data,
          'created_at', ob.created_at
        ) ORDER BY ob.created_at DESC
      ) as details
    FROM operation_batches ob
    GROUP BY ob.batch_group, ob.user_id, ob.full_name, ob.email, ob.profile_picture_url
  )
  SELECT 
    bo.batch_id,
    bo.user_id,
    bo.user_name,
    bo.user_email,
    bo.profile_picture_url,
    bo.first_operation,
    bo.last_operation,
    bo.operation_count,
    bo.operation_types,
    bo.user_name || ' made ' || bo.operation_count || ' change' || 
      CASE WHEN bo.operation_count > 1 THEN 's' ELSE '' END as summary,
    bo.details
  FROM batched_operations bo
  ORDER BY bo.first_operation DESC
  LIMIT limit_batches
  OFFSET offset_batches;
END;
$function$;