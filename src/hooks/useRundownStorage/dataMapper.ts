
import { SavedRundown } from './types';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { normalizeStartTime } from '@/utils/timeUtils';

export const mapDatabaseToRundown = (dbRundown: any): SavedRundown => {
  // Extract time portion from start_time, keep it as HH:MM:SS only
  const timeOnly = dbRundown.start_time 
    ? (dbRundown.start_time.includes('T') 
        ? new Date(dbRundown.start_time).toTimeString().slice(0, 8)
        : dbRundown.start_time)
    : '09:00:00';

  const mapped = {
    id: dbRundown.id,
    user_id: dbRundown.user_id,
    title: dbRundown.title,
    items: dbRundown.items || [],
    columns: dbRundown.columns,
    timezone: dbRundown.timezone,
    start_time: timeOnly, // Keep as HH:MM:SS for first-row timing
    show_date: dbRundown.show_date, // Separate date field
    icon: dbRundown.icon,
    archived: dbRundown.archived || false,
    created_at: dbRundown.created_at,
    updated_at: dbRundown.updated_at,
    undo_history: dbRundown.undo_history || [],
    team_id: dbRundown.team_id,
    visibility: dbRundown.visibility,
    folder_id: dbRundown.folder_id || null,
    teams: dbRundown.teams,
    creator_profile: dbRundown.creator_profile
  };
  
  return mapped;
};

export const mapRundownToDatabase = (rundown: SavedRundown, userId: string) => {
  return {
    id: rundown.id,
    user_id: userId,
    title: rundown.title,
    items: rundown.items || [],
    columns: rundown.columns,
    timezone: rundown.timezone,
    start_time: rundown.start_time, // Keep as HH:MM:SS
    show_date: rundown.show_date, // Separate date field
    icon: rundown.icon,
    archived: rundown.archived || false,
    undo_history: rundown.undo_history || [],
    team_id: rundown.team_id,
    visibility: rundown.visibility || 'private',
    folder_id: rundown.folder_id || null,
    updated_at: new Date().toISOString()
  };
};

export const mapRundownsFromDatabase = (dbRundowns: any[]): SavedRundown[] => {
  return dbRundowns.map(mapDatabaseToRundown);
};
