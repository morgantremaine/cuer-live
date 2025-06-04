import { supabase } from '@/integrations/supabase/client'
import { RundownItem } from '@/types/rundown'
import { Column } from '@/hooks/useColumnsManager'

export const loadRundownsFromDatabase = async (userId: string) => {
  return await supabase
    .from('rundowns')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
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
  return await supabase
    .from('rundowns')
    .insert({
      title,
      items,
      user_id: userId,
      columns,
      timezone,
      start_time: startTime,
      icon
    })
    .select()
    .single()
}

export const updateRundownInDatabase = async (
  id: string,
  userId: string,
  title: string,
  items: RundownItem[],
  archived: boolean,
  columns?: Column[],
  timezone?: string,
  startTime?: string,
  icon?: string,
  undoHistory?: any[]
) => {
  return await supabase
    .from('rundowns')
    .update({
      title,
      items,
      archived,
      columns,
      timezone,
      start_time: startTime,
      icon,
      undo_history: undoHistory
    })
    .eq('id', id)
    .eq('user_id', userId)
}

export const deleteRundownFromDatabase = async (id: string, userId: string) => {
  return await supabase
    .from('rundowns')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
}
