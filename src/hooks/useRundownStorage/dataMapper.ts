
import { SavedRundown } from './types'

export const mapRundownFromDatabase = (rundown: any): SavedRundown => ({
  ...rundown,
  startTime: rundown.start_time // Map start_time to startTime for consistency
})

export const mapRundownsFromDatabase = (data: any[]): SavedRundown[] => {
  const mappedData = (data || []).map(mapRundownFromDatabase)
  console.log('Loaded rundowns with icons:', mappedData.map(r => ({ id: r.id, title: r.title, hasIcon: !!r.icon })))
  return mappedData
}

export const createUpdatePayload = (
  title: string,
  items: RundownItem[],
  columns?: Column[],
  timezone?: string,
  startTime?: string,
  icon?: string,
  archived = false
) => {
  const updateData = {
    title: title,
    items: items,
    columns: columns || null,
    timezone: timezone || null,
    start_time: startTime || null, // Use start_time to match database column
    icon: icon !== undefined ? (icon || null) : undefined, // Only include icon in update if explicitly provided
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
