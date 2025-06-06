
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
    teams: null // Set to null since we're not joining teams data currently
  }))
}
