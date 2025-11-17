-- Fix search_path for the two new functions
DROP FUNCTION IF EXISTS get_batched_rundown_history(uuid, integer, integer, integer);
DROP FUNCTION IF EXISTS cleanup_old_rundown_operations();

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION get_batched_rundown_history(
  target_rundown_id uuid,
  batch_window_seconds integer DEFAULT 30,
  limit_batches integer DEFAULT 50,
  offset_batches integer DEFAULT 0
)
RETURNS TABLE (
  batch_id text,
  user_id uuid,
  user_name text,
  user_email text,
  profile_picture_url text,
  operation_types text[],
  summary text,
  first_operation timestamp with time zone,
  last_operation timestamp with time zone,
  operation_count integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      -- Create batch groups: same user within batch_window_seconds
      SUM(CASE 
        WHEN LAG(ro.user_id) OVER (ORDER BY ro.created_at) = ro.user_id
          AND (ro.created_at - LAG(ro.created_at) OVER (ORDER BY ro.created_at)) < (batch_window_seconds || ' seconds')::interval
        THEN 0 
        ELSE 1 
      END) OVER (ORDER BY ro.created_at) as batch_group
    FROM rundown_operations ro
    LEFT JOIN profiles p ON p.id = ro.user_id
    WHERE ro.rundown_id = target_rundown_id
    ORDER BY ro.created_at DESC
  ),
  batched_operations AS (
    SELECT
      batch_group,
      user_id,
      COALESCE(full_name, email) as user_name,
      email as user_email,
      profile_picture_url,
      array_agg(DISTINCT operation_type ORDER BY operation_type) as operation_types,
      array_agg(operation_data ORDER BY created_at) as all_operation_data,
      MIN(created_at) as first_operation,
      MAX(created_at) as last_operation,
      COUNT(*) as operation_count
    FROM operation_batches
    GROUP BY batch_group, user_id, full_name, email, profile_picture_url
    ORDER BY first_operation DESC
    LIMIT limit_batches
    OFFSET offset_batches
  )
  SELECT
    batch_group::text as batch_id,
    user_id,
    user_name,
    user_email,
    profile_picture_url,
    operation_types,
    -- Generate summary based on operation types
    CASE
      WHEN 'cell_edit' = ANY(operation_types) AND array_length(operation_types, 1) = 1 THEN
        CASE
          WHEN operation_count = 1 THEN 'Edited a field'
          WHEN operation_count <= 5 THEN 'Edited ' || operation_count || ' fields'
          ELSE 'Made ' || operation_count || ' changes'
        END
      WHEN 'add_row' = ANY(operation_types) AND array_length(operation_types, 1) = 1 THEN
        'Added ' || operation_count || ' row' || CASE WHEN operation_count > 1 THEN 's' ELSE '' END
      WHEN 'delete_row' = ANY(operation_types) AND array_length(operation_types, 1) = 1 THEN
        'Deleted ' || operation_count || ' row' || CASE WHEN operation_count > 1 THEN 's' ELSE '' END
      WHEN 'reorder' = ANY(operation_types) THEN
        'Reordered rows'
      WHEN 'move_row' = ANY(operation_types) THEN
        'Moved ' || operation_count || ' row' || CASE WHEN operation_count > 1 THEN 's' ELSE '' END
      ELSE
        'Made ' || operation_count || ' change' || CASE WHEN operation_count > 1 THEN 's' ELSE '' END
    END as summary,
    first_operation,
    last_operation,
    operation_count,
    jsonb_build_object(
      'operations', all_operation_data,
      'operation_types', operation_types
    ) as details
  FROM batched_operations;
END;
$$;

-- Create cleanup function for old rundown operations (90 day retention)
CREATE OR REPLACE FUNCTION cleanup_old_rundown_operations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rundown_operations 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleaned up rundown operations older than 90 days';
END;
$$;