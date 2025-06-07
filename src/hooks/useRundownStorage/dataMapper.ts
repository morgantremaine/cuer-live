
import { SavedRundown } from './types'

export const mapDatabaseToRundown = (data: any): SavedRundown => {
  return {
    id: data.id,
    title: data.title,
    items: data.items || [],
    user_id: data.user_id,
    team_id: data.team_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    archived: data.archived || false,
    columns: data.columns,
    timezone: data.timezone,
    start_time: data.start_time,
    icon: data.icon,
    undo_history: data.undo_history || [],
    // Map creator profile if available
    creator_profile: data.creator_profile ? {
      full_name: data.creator_profile.full_name,
      email: data.creator_profile.email
    } : undefined
  }
}

export const mapRundownToDatabase = (rundown: SavedRundown, userId: string) => {
  return {
    id: rundown.id,
    title: rundown.title,
    items: rundown.items,
    user_id: userId,
    team_id: rundown.team_id,
    archived: rundown.archived,
    columns: rundown.columns,
    timezone: rundown.timezone,
    start_time: rundown.start_time,
    icon: rundown.icon,
    undo_history: rundown.undo_history,
    updated_at: new Date().toISOString()
  }
}

export const mapRundownsFromDatabase = (data: any[]): SavedRundown[] => {
  return data.map(mapDatabaseToRundown)
}
