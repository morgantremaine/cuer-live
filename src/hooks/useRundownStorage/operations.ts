
import { supabase } from '@/lib/supabase'
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'

export const loadRundownsFromDatabase = async (userId: string) => {
  console.log('Loading rundowns from database for user:', userId)
  
  // For now, load only user's own rundowns due to simplified RLS policies
  const { data, error } = await supabase
    .from('rundowns')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Database error loading rundowns:', error)
    return { data: null, error }
  }

  console.log('Loaded rundowns from database:', data?.length || 0)
  return { data, error: null }
}

export const saveRundownToDatabase = async (
  userId: string, 
  title: string, 
  items: RundownItem[], 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string, 
  icon?: string,
  teamId?: string
) => {
  console.log('Saving rundown to database:', title)
  
  const rundownData = {
    user_id: userId,
    title,
    items,
    columns,
    timezone,
    start_time: startTime,
    icon,
    team_id: teamId || null,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('rundowns')
    .insert(rundownData)
    .select()
    .single()

  if (error) {
    console.error('Database error saving rundown:', error)
    return { data: null, error }
  }

  console.log('Rundown saved successfully:', data.id)
  return { data, error: null }
}

export const updateRundownInDatabase = async (
  id: string,
  userId: string,
  title: string,
  items: RundownItem[],
  archived: boolean = false,
  columns?: Column[],
  timezone?: string,
  startTime?: string,
  icon?: string,
  undoHistory?: any[],
  teamId?: string
) => {
  console.log('Updating rundown in database:', id)
  
  const updateData = {
    title,
    items,
    archived,
    columns,
    timezone,
    start_time: startTime,
    icon,
    undo_history: undoHistory,
    team_id: teamId,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('rundowns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Database error updating rundown:', error)
    return { data: null, error }
  }

  console.log('Rundown updated successfully:', data.id)
  return { data, error: null }
}

export const deleteRundownFromDatabase = async (id: string, userId: string) => {
  console.log('Deleting rundown from database:', id)
  
  const { error } = await supabase
    .from('rundowns')
    .delete()
    .eq('id', id)
    .eq('user_id', userId) // Only allow deleting own rundowns

  if (error) {
    console.error('Database error deleting rundown:', error)
    return { error }
  }

  console.log('Rundown deleted successfully:', id)
  return { error: null }
}
