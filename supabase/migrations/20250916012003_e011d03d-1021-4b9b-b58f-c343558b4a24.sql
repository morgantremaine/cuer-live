-- Cleanup script for cuertest@gmail.com account
-- This will remove all data associated with this test account

DO $$
DECLARE
    target_email TEXT := 'cuertest@gmail.com';
    target_user_id UUID;
    team_record RECORD;
    deletion_summary JSONB;
BEGIN
    -- Initialize summary
    deletion_summary := jsonb_build_object(
        'email', target_email,
        'rundowns_deleted', 0,
        'blueprints_deleted', 0,
        'teams_deleted', 0,
        'subscriptions_deleted', 0,
        'invitations_deleted', 0,
        'other_records_deleted', 0
    );

    -- Find the user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'No user found with email: %', target_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Found user ID: % for email: %', target_user_id, target_email;

    -- 1. Delete rundowns and count them
    WITH deleted_rundowns AS (
        DELETE FROM rundowns 
        WHERE user_id = target_user_id 
        RETURNING id
    )
    SELECT count(*) INTO deletion_summary FROM deleted_rundowns;
    
    deletion_summary := jsonb_set(deletion_summary, '{rundowns_deleted}', to_jsonb((deletion_summary->>'rundowns_deleted')::int));

    -- 2. Delete blueprints and count them
    WITH deleted_blueprints AS (
        DELETE FROM blueprints 
        WHERE user_id = target_user_id 
        RETURNING id
    )
    SELECT count(*) INTO deletion_summary FROM deleted_blueprints;
    
    deletion_summary := jsonb_set(deletion_summary, '{blueprints_deleted}', to_jsonb((deletion_summary->>'blueprints_deleted')::int));

    -- 3. Delete team invitations (both sent and received)
    WITH deleted_invitations AS (
        DELETE FROM team_invitations 
        WHERE email = target_email OR invited_by = target_user_id
        RETURNING id
    )
    SELECT count(*) INTO deletion_summary FROM deleted_invitations;
    
    deletion_summary := jsonb_set(deletion_summary, '{invitations_deleted}', to_jsonb((deletion_summary->>'invitations_deleted')::int));

    -- 4. Clean up other user-specific data
    DELETE FROM user_column_preferences WHERE user_id = target_user_id;
    DELETE FROM rundown_presence WHERE user_id = target_user_id;
    DELETE FROM user_rundown_zoom_preferences WHERE user_id = target_user_id;
    DELETE FROM team_conversations WHERE user_id = target_user_id;
    DELETE FROM app_notification_dismissals WHERE user_id = target_user_id;
    DELETE FROM rundown_operations WHERE user_id = target_user_id;
    DELETE FROM showcaller_sessions WHERE controller_user_id = target_user_id;
    DELETE FROM team_custom_columns WHERE created_by = target_user_id;
    DELETE FROM team_api_keys WHERE created_by = target_user_id;
    DELETE FROM rundown_folders WHERE created_by = target_user_id;

    -- 5. Get user's teams before removing membership
    FOR team_record IN 
        SELECT tm.team_id, t.name as team_name
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = target_user_id
    LOOP
        RAISE NOTICE 'Processing team: % (%)', team_record.team_name, team_record.team_id;
        
        -- Remove user from team
        DELETE FROM team_members WHERE user_id = target_user_id AND team_id = team_record.team_id;
        
        -- Check if team has any remaining members
        IF NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = team_record.team_id) THEN
            RAISE NOTICE 'Deleting empty team: %', team_record.team_id;
            -- Delete empty team
            DELETE FROM teams WHERE id = team_record.team_id;
            deletion_summary := jsonb_set(deletion_summary, '{teams_deleted}', 
                to_jsonb((deletion_summary->>'teams_deleted')::int + 1));
        END IF;
    END LOOP;

    -- 6. Delete subscription data
    WITH deleted_subscriptions AS (
        DELETE FROM subscribers 
        WHERE email = target_email OR user_id = target_user_id
        RETURNING id
    )
    SELECT count(*) INTO deletion_summary FROM deleted_subscriptions;
    
    deletion_summary := jsonb_set(deletion_summary, '{subscriptions_deleted}', to_jsonb((deletion_summary->>'subscriptions_deleted')::int));

    -- 7. Delete profile
    DELETE FROM profiles WHERE id = target_user_id;

    -- 8. Delete auth user (this will cascade to related auth tables)
    DELETE FROM auth.users WHERE id = target_user_id;

    RAISE NOTICE 'Cleanup completed successfully for %', target_email;
    RAISE NOTICE 'Summary: %', deletion_summary;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during cleanup: %', SQLERRM;
        RAISE;
END $$;