import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'
import { useToast } from '@/hooks/use-toast'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  columns?: Column[]
  timezone?: string
  created_at: string
  updated_at: string
  archived?: boolean
  startTime?: string
  team_id?: string | null
  visibility: 'private' | 'team'
  user_id: string
}

export const useRundownStorage = () => {
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadRundowns = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('rundowns')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error loading rundowns:', error)
      toast({
        title: 'Error',
        description: 'Failed to load rundowns',
        variant: 'destructive',
      })
    } else {
      setSavedRundowns(data || [])
    }
    setLoading(false)
  }

  const saveRundown = async (
    title: string, 
    items: RundownItem[], 
    columns?: Column[], 
    timezone?: string,
    teamId?: string | null,
    visibility: 'private' | 'team' = 'private'
  ) => {
    if (!user) {
      console.error('Cannot save: no user')
      return
    }

    console.log('Saving new rundown to database:', { 
      title, 
      itemsCount: items.length, 
      columnsCount: columns?.length || 0, 
      timezone, 
      userId: user.id,
      teamId,
      visibility
    })

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        user_id: user.id,
        title,
        items,
        columns: columns || null,
        timezone: timezone || null,
        archived: false,
        team_id: teamId,
        visibility
      })
      .select()
      .single()

    if (error) {
      console.error('Database error saving rundown:', error)
      toast({
        title: 'Error',
        description: 'Failed to save rundown',
        variant: 'destructive',
      })
      throw error
    } else {
      console.log('Successfully saved new rundown:', data)
      toast({
        title: 'Success',
        description: 'Rundown saved successfully!',
      })
      loadRundowns()
      return data
    }
  }

  const updateRundown = async (
    id: string, 
    title: string, 
    items: RundownItem[], 
    silent = false, 
    archived = false, 
    columns?: Column[], 
    timezone?: string,
    teamId?: string | null,
    visibility?: 'private' | 'team'
  ) => {
    if (!user) {
      console.error('Cannot update: no user')
      return
    }

    console.log('Updating rundown in database:', {
      id,
      title,
      itemsCount: items.length,
      columnsCount: columns?.length || 0,
      timezone,
      userId: user.id,
      silent,
      archived,
      teamId,
      visibility
    })

    const updateData: any = {
      title: title,
      items: items,
      columns: columns || null,
      timezone: timezone || null,
      updated_at: new Date().toISOString(),
      archived: archived
    }

    if (teamId !== undefined) {
      updateData.team_id = teamId
    }

    if (visibility !== undefined) {
      updateData.visibility = visibility
    }

    console.log('Update payload (cleaned):', updateData)

    const { error, data } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database error updating rundown:', {
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        id,
        userId: user.id,
        updateData
      })
      if (!silent) {
        toast({
          title: 'Error',
          description: `Failed to update rundown: ${error.message}`,
          variant: 'destructive',
        })
      }
      throw error
    } else {
      console.log('Successfully updated rundown:', { id, updatedData: data })
      if (!silent) {
        const message = archived ? 'Rundown archived successfully!' : 'Rundown updated successfully!'
        toast({
          title: 'Success',
          description: message,
        })
      }
      loadRundowns()
    }
  }

  const updateRundownVisibility = async (id: string, visibility: 'private' | 'team', teamId?: string | null) => {
    if (!user) return

    const updateData: any = { visibility }
    if (visibility === 'team' && teamId) {
      updateData.team_id = teamId
    } else if (visibility === 'private') {
      updateData.team_id = null
    }

    const { error } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rundown visibility',
        variant: 'destructive',
      })
      throw error
    } else {
      toast({
        title: 'Success',
        description: `Rundown is now ${visibility}`,
      })
      loadRundowns()
    }
  }

  const deleteRundown = async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('rundowns')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete rundown',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Rundown deleted successfully!',
      })
      loadRundowns()
    }
  }

  useEffect(() => {
    if (user) {
      loadRundowns()
    }
  }, [user])

  return {
    savedRundowns,
    loading,
    saveRundown,
    updateRundown,
    updateRundownVisibility,
    deleteRundown,
    loadRundowns,
  }
}
