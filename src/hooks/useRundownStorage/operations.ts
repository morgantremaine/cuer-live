
import { supabase } from '@/lib/supabase'
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'
import { createUpdatePayload } from './dataMapper'

export const loadRundownsFromDatabase = async (userId: string) => {
  const { data, error } = await supabase
    .from('rundowns')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  return { data, error }
}

export const saveRundownToDatabase = async (
  userId: string,
  title: string,
  items: RundownItem[],
  columns?: Column[],
  timezone?: string,
  startTime?: string,
  icon?: string
) => {
  console.log('Saving new rundown to database:', { title, itemsCount: items.length, columnsCount: columns?.length || 0, timezone, startTime, userId })

  const { data, error } = await supabase
    .from('rundowns')
    .insert({
      user_id: userId,
      title,
      items,
      columns: columns || null,
      timezone: timezone || null,
      start_time: startTime || null,
      icon: icon || null,
      archived: false,
      undo_history: []
    })
    .select()
    .single()

  return { data, error }
}

export const updateRundownInDatabase = async (
  id: string,
  userId: string,
  title: string,
  items: RundownItem[],
  archived = false,
  columns?: Column[],
  timezone?: string,
  startTime?: string,
  icon?: string,
  undoHistory?: any[]
) => {
  console.log('Updating rundown in database:', {
    id,
    title,
    itemsCount: items.length,
    columnsCount: columns?.length || 0,
    timezone,
    startTime,
    userId,
    archived,
    undoHistoryCount: undoHistory?.length || 0
  })

  const updateData = createUpdatePayload(title, items, columns, timezone, startTime, icon, archived, undoHistory)
  console.log('Update payload (cleaned):', updateData)

  const { error, data } = await supabase
    .from('rundowns')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()

  return { error, data }
}

export const deleteRundownFromDatabase = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('rundowns')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  return { error }
}
