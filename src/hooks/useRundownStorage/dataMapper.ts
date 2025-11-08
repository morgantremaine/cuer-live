
import { SavedRundown } from './types';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';

export const mapDatabaseToRundown = (dbRundown: any): SavedRundown => {
  const mapped = {
    id: dbRundown.id,
    user_id: dbRundown.user_id,
    title: dbRundown.title,
    items: dbRundown.items || [],
    columns: dbRundown.columns,
    timezone: dbRundown.timezone,
    start_time: dbRundown.start_time,
    end_time: dbRundown.end_time,
    show_date: dbRundown.show_date,
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
    start_time: rundown.start_time,
    end_time: rundown.end_time,
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
