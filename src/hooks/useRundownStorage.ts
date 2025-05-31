
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
  created_at: string
  updated_at: string
  archived?: boolean
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
      .eq('user_id', user.id)
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

  const saveRundown = async (title: string, items: RundownItem[], columns?: Column[]) => {
    if (!user) {
      console.error('Cannot save: no user')
      return
    }

    console.log('Saving new rundown to database:', { title, itemsCount: items.length, columnsCount: columns?.length || 0, userId: user.id })

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        user_id: user.id,
        title,
        items,
        columns: columns || null,
        archived: false
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

  const updateRundown = async (id: string, title: string, items: RundownItem[], silent = false, archived = false, columns?: Column[]) => {
    if (!user) {
      console.error('Cannot update: no user')
      return
    }

    console.log('Updating rundown in database:', {
      id,
      title,
      itemsCount: items.length,
      columnsCount: columns?.length || 0,
      userId: user.id,
      silent,
      archived
    })

    const updateData = {
      title: title,
      items: items,
      columns: columns || null,
      updated_at: new Date().toISOString(),
      archived: archived
    }

    console.log('Update payload (cleaned):', updateData)

    const { error, data } = await supabase
      .from('rundowns')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
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
    deleteRundown,
    loadRundowns,
  }
}
