-- Fix UUID type mismatch in get_batched_rundown_history function
CREATE OR REPLACE FUNCTION get_batched_rundown_history(
  target_rundown_id text,
  batch_window_seconds integer DEFAULT 300,
  limit_batches integer DEFAULT 50,
  offset_batches integer DEFAULT 0
)
RETURNS TABLE (
  batch_id text,
  user_id text,
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
AS $$
BEGIN
  RETURN QUERY
  WITH operations_with_prev AS (
    SELECT 
      ro.id,
      ro.user_id,
      ro.operation_type,
      ro.operation_data,
      ro.created_at,
      p.full_name,
      p.email,
      p.profile_picture_url,
      LAG(ro.user_id) OVER (ORDER BY ro.created_at) as prev_user_id,
      LAG(ro.created_at) OVER (ORDER BY ro.created_at) as prev_created_at
    FROM rundown_operations ro
    LEFT JOIN profiles p ON ro.user_id = p.id
    WHERE ro.rundown_id = target_rundown_id::uuid
    ORDER BY ro.created_at DESC
  ),
  operation_batches AS (
    SELECT 
      owp.id,
      owp.user_id,
      owp.operation_type,
      owp.operation_data,
      owp.created_at,
      owp.full_name,
      owp.email,
      owp.profile_picture_url,
      owp.prev_user_id,
      owp.prev_created_at,
      SUM(CASE 
        WHEN owp.prev_user_id = owp.user_id
          AND (owp.created_at - owp.prev_created_at) < (batch_window_seconds || ' seconds')::interval
        THEN 0 
        ELSE 1 
      END) OVER (ORDER BY owp.created_at) as batch_group
    FROM operations_with_prev owp
    ORDER BY owp.created_at DESC
  ),
  batched_operations AS (
    SELECT
      batch_group::text || '-' || user_id as batch_id,
      user_id,
      COALESCE(full_name, 'Unknown User') as user_name,
      email as user_email,
      profile_picture_url,
      MIN(created_at) as first_operation,
      MAX(created_at) as last_operation,
      COUNT(*) as operation_count,
      array_agg(DISTINCT operation_type) as operation_types,
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'operation_type', operation_type,
          'operation_data', operation_data,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ) as details
    FROM operation_batches
    GROUP BY batch_group, user_id, full_name, email, profile_picture_url
    ORDER BY first_operation DESC
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
    CASE 
      WHEN bo.operation_count = 1 THEN
        CASE bo.operation_types[1]
          WHEN 'add_row' THEN 'Added a row'
          WHEN 'delete_row' THEN 'Deleted a row'
          WHEN 'move_row' THEN 'Moved a row'
          WHEN 'copy_row' THEN 'Copied a row'
          WHEN 'reorder_rows' THEN 'Reordered rows'
          WHEN 'lock_row' THEN 'Locked a row'
          WHEN 'unlock_row' THEN 'Unlocked a row'
          ELSE 'Made a change'
        END
      ELSE 'Made ' || bo.operation_count || ' changes'
    END as summary,
    bo.details
  FROM batched_operations bo
  LIMIT limit_batches
  OFFSET offset_batches;
END;
$$;