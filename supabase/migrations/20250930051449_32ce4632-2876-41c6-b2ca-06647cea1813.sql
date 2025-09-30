-- Enable operation mode for all rundowns that currently have it disabled
UPDATE rundowns 
SET operation_mode_enabled = true,
    updated_at = now()
WHERE operation_mode_enabled = false OR operation_mode_enabled IS NULL;