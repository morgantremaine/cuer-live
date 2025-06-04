import { RundownItem } from '@/types/rundown'
import { SavedRundown } from './types'

export const mapRundownFromDatabase = (rundown: any): SavedRundown => ({
  ...rundown,
  startTime: rundown.start_time // Map start_time to startTime for consistency
})

export const mapRundownsFromDatabase = (data: any[]): SavedRundown[] => {
  return data.map(row => ({
    id: row.id,
    title: row.title,
    items: row.items,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id,
    archived: row.archived,
    columns: row.columns,
    timezone: row.timezone,
    start_time: row.start_time,
    icon: row.icon
  }))
}

export const createUpdatePayload = (
  title: string,
  items: RundownItem[],
  columns?: Column[],
  timezone?: string,
  startTime?: string,
  icon?: string,
  archived = false,
  undoHistory?: any[]
) => {
  const updateData = {
    title: title,
    items: items,
    columns: columns || null,
    timezone: timezone || null,
    start_time: startTime || null, // Use start_time to match database column
    icon: icon !== undefined ? (icon || null) : undefined, // Only include icon in update if explicitly provided
    undo_history: undoHistory !== undefined ? undoHistory : undefined, // Only include undo_history if explicitly provided
    updated_at: new Date().toISOString(),
    archived: archived
  }

  // Remove undefined values to avoid overwriting with undefined
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key]
    }
  })

  return updateData
}
