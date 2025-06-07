
import { SavedRundown } from './types'

export const mapRundownsFromDatabase = (data: any[]): SavedRundown[] => {
  if (!data || !Array.isArray(data)) {
    return []
  }

  return data.map(rundown => ({
    id: rundown.id,
    user_id: rundown.user_id,
    title: rundown.title,
    items: rundown.items || [],
    columns: rundown.columns,
    timezone: rundown.timezone,
    start_time: rundown.start_time,
    icon: rundown.icon,
    archived: rundown.archived || false,
    created_at: rundown.created_at,
    updated_at: rundown.updated_at,
    undo_history: rundown.undo_history || [],
    team_id: rundown.team_id,
    visibility: rundown.visibility,
    teams: rundown.teams ? {
      id: rundown.teams.id,
      name: rundown.teams.name
    } : null
  }))
}

export const mapDatabaseToRundown = (data: any): SavedRundown => {
  return {
    id: data.id,
    user_id: data.user_id,
    title: data.title,
    items: data.items || [],
    columns: data.columns,
    timezone: data.timezone,
    start_time: data.start_time,
    icon: data.icon,
    archived: data.archived || false,
    created_at: data.created_at,
    updated_at: data.updated_at,
    undo_history: data.undo_history || [],
    team_id: data.team_id,
    visibility: data.visibility,
    teams: data.teams ? {
      id: data.teams.id,
      name: data.teams.name
    } : null
  }
}

export const mapRundownToDatabase = (rundown: SavedRundown, userId: string) => {
  const data: any = {
    user_id: userId,
    title: rundown.title,
    items: rundown.items,
    columns: rundown.columns,
    timezone: rundown.timezone,
    start_time: rundown.start_time,
    icon: rundown.icon,
    archived: rundown.archived || false,
    undo_history: rundown.undo_history || [],
    team_id: rundown.team_id,
    visibility: rundown.visibility,
    updated_at: new Date().toISOString()
  };

  // Only include id if it exists and is not empty
  if (rundown.id && rundown.id !== '') {
    data.id = rundown.id;
  }

  return data;
}
