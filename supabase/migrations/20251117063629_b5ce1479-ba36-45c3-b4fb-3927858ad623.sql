-- Drop and recreate the get_batched_rundown_history function to fix nested window functions
DROP FUNCTION IF EXISTS public.get_batched_rundown_history(uuid, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_batched_rundown_history(
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
  operation_count bigint,
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
    LEFT JOIN profiles p ON p.id = ro.user_id
    WHERE ro.rundown_id = target_rundown_id
  ),
  operation_batches AS (
    SELECT 
      *,
      SUM(CASE 
        WHEN prev_user_id = user_id
          AND (created_at - prev_created_at) < (batch_window_seconds || ' seconds')::interval
        THEN 0 
        ELSE 1 
      END) OVER (ORDER BY created_at) as batch_group
    FROM operations_with_prev
    ORDER BY created_at DESC
  ),
  batched_operations AS (
    SELECT 
      batch_group,
      user_id,
      full_name,
      email,
      profile_picture_url,
      array_agg(DISTINCT operation_type ORDER BY operation_type) as operation_types,
      MIN(created_at) as first_operation,
      MAX(created_at) as last_operation,
      COUNT(*) as operation_count,
      jsonb_build_object(
        'operations', jsonb_agg(
          jsonb_build_object(
            'type', operation_type,
            'timestamp', created_at,
            'fieldUpdates', CASE 
              WHEN operation_type = 'cell_edit' THEN 
                jsonb_build_array(
                  jsonb_build_object(
                    'field', operation_data->>'field',
                    'oldValue', operation_data->>'oldValue',
                    'newValue', operation_data->>'newValue',
                    'itemId', operation_data->>'itemId'
                  )
                )
              ELSE NULL
            END
          ) ORDER BY created_at DESC
        ),
        'operation_types', array_agg(DISTINCT operation_type ORDER BY operation_type)
      ) as details
    FROM operation_batches
    GROUP BY batch_group, user_id, full_name, email, profile_picture_url
    ORDER BY first_operation DESC
    LIMIT limit_batches
    OFFSET offset_batches
  )
  SELECT 
    'batch_' || batch_group::text as batch_id,
    user_id,
    COALESCE(full_name, 'Unknown User') as user_name,
    COALESCE(email, '') as user_email,
    profile_picture_url,
    operation_types,
    CASE 
      WHEN operation_count = 1 THEN 
        CASE operation_types[1]
          WHEN 'cell_edit' THEN 'Edited a cell'
          WHEN 'add_row' THEN 'Added a row'
          WHEN 'delete_row' THEN 'Deleted a row'
          WHEN 'reorder' THEN 'Reordered rows'
          ELSE 'Made a change'
        END
      ELSE 'Made ' || operation_count || ' changes'
    END as summary,
    first_operation,
    last_operation,
    operation_count,
    details
  FROM batched_operations;
END;
$$;