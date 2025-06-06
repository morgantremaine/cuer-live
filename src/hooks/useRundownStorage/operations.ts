
import { supabase } from '@/lib/supabase'
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'

export const loadRundownsFromDatabase = async (userId: string) => {
  console.log('Loading rundowns from database for user:', userId)
  
  // Load user's own rundowns and team rundowns they have access to
  // The RLS policies will automatically filter to show only accessible rundowns
  const { data, error } = await supabase
    .from('rundowns')
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
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
  
  // Get user's default team if no teamId provided
  let finalTeamId = teamId;
  if (!finalTeamId) {
    const { data: userTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .limit(1);
    
    if (userTeams && userTeams.length > 0) {
      finalTeamId = userTeams[0].team_id;
    }
  }
  
  const rundownData = {
    user_id: userId,
    title,
    items,
    columns,
    timezone,
    start_time: startTime,
    icon,
    team_id: finalTeamId,
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
  
  // Get user's default team if no teamId provided
  let finalTeamId = teamId;
  if (!finalTeamId) {
    const { data: userTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .limit(1);
    
    if (userTeams && userTeams.length > 0) {
      finalTeamId = userTeams[0].team_id;
    }
  }
  
  const updateData = {
    title,
    items,
    archived,
    columns,
    timezone,
    start_time: startTime,
    icon,
    undo_history: undoHistory,
    team_id: finalTeamId,
    updated_at: new Date().toISOString()
  }

  console.log('Update data:', updateData);
  console.log('Updating rundown with ID:', id, 'for user:', userId);

  // First, let's check if the rundown exists and if the user has access to it
  const { data: existingRundown, error: checkError } = await supabase
    .from('rundowns')
    .select('id, user_id, team_id')
    .eq('id', id)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking rundown existence:', checkError);
    return { data: null, error: checkError };
  }

  if (!existingRundown) {
    console.error('Rundown not found or user does not have access:', id);
    const notFoundError = new Error('Rundown not found or access denied');
    return { data: null, error: notFoundError };
  }

  console.log('Found existing rundown:', existingRundown);

  // Now perform the update
  const { data, error } = await supabase
    .from('rundowns')
    .update(updateData)
    .eq('id', id)
    .select()
    .maybeSingle(); // Use maybeSingle instead of single to avoid the error

  if (error) {
    console.error('Database error updating rundown:', error)
    return { data: null, error }
  }

  if (!data) {
    console.error('No data returned from update - RLS may be blocking the operation');
    const rlsError = new Error('Update blocked by Row Level Security policies');
    return { data: null, error: rlsError };
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

  if (error) {
    console.error('Database error deleting rundown:', error)
    return { error }
  }

  console.log('Rundown deleted successfully:', id)
  return { error: null }
}
