-- Migration function to convert whole-document rundowns to normalized per-row items
CREATE OR REPLACE FUNCTION migrate_rundown_to_normalized_items(target_rundown_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    rundown_data JSONB;
    item JSONB;
    item_index INTEGER := 0;
BEGIN
    -- Get the current rundown data
    SELECT data INTO rundown_data 
    FROM rundowns 
    WHERE id = target_rundown_id;
    
    IF rundown_data IS NULL THEN
        RAISE EXCEPTION 'Rundown not found: %', target_rundown_id;
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
        END LOOP;
        
        -- Mark rundown as migrated by updating a flag
        UPDATE rundowns 
        SET data = rundown_data || '{"migrated_to_per_row": true}'::jsonb
        WHERE id = target_rundown_id;
        
        RETURN TRUE;
    ELSE
        -- No items to migrate
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;