-- Drop and recreate the migration function with proper logging
DROP FUNCTION IF EXISTS migrate_rundown_to_normalized_items(UUID);

CREATE OR REPLACE FUNCTION migrate_rundown_to_normalized_items(target_rundown_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rundown_data JSONB;
    item JSONB;
    item_index INTEGER := 0;
    items_migrated INTEGER := 0;
BEGIN
    -- Get the current rundown data
    SELECT data INTO rundown_data 
    FROM rundowns 
    WHERE id = target_rundown_id;
    
    IF rundown_data IS NULL THEN
        RAISE EXCEPTION 'Rundown not found: %', target_rundown_id;
    END IF;
    
    -- Check if already migrated
    IF rundown_data ? 'migrated_to_per_row' AND (rundown_data->>'migrated_to_per_row')::boolean = true THEN
        RAISE NOTICE 'Rundown % already migrated to per-row format', target_rundown_id;
        RETURN TRUE;
    END IF;
    
    -- Extract items array from the rundown data
    IF rundown_data ? 'items' THEN
        -- Insert each item into normalized table
        FOR item IN SELECT * FROM jsonb_array_elements(rundown_data->'items')
        LOOP
            INSERT INTO rundown_items (
                rundown_id,
                item_id, 
                item_data,
                item_index,
                item_version,
                created_at,
                updated_at
            ) VALUES (
                target_rundown_id,
                (item->>'id')::text,
                item,
                item_index,
                1,
                NOW(),
                NOW()
            ) ON CONFLICT (rundown_id, item_id) DO UPDATE SET
                item_data = EXCLUDED.item_data,
                item_index = EXCLUDED.item_index,
                item_version = rundown_items.item_version + 1,
                updated_at = NOW();
                
            item_index := item_index + 1;
            items_migrated := items_migrated + 1;
        END LOOP;
        
        -- Mark rundown as migrated by updating a flag
        UPDATE rundowns 
        SET data = rundown_data || '{"migrated_to_per_row": true}'::jsonb
        WHERE id = target_rundown_id;
        
        RAISE NOTICE 'Successfully migrated % items for rundown %', items_migrated, target_rundown_id;
        RETURN TRUE;
    ELSE
        -- No items to migrate
        RAISE NOTICE 'No items found to migrate for rundown %', target_rundown_id;
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;