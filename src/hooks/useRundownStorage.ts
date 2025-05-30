import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { RundownItem } from '@/hooks/useRundownItems'
import { useToast } from '@/hooks/use-toast'
import { Column } from '@/hooks/useColumnsManager'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  column_config?: Column[]
  created_at: string
  updated_at: string
  is_archived?: boolean
}

export const useRundownStorage = () => {
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadRundowns = async () => {
    if (!user) {
      console.log('No user found, skipping rundown load');
      return;
    }

    setLoading(true)
    console.log('Loading rundowns for user:', user.id)
    
    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading rundowns:', error)
        toast({
          title: 'Error',
          description: `Failed to load rundowns: ${error.message}`,
          variant: 'destructive',
        })
      } else {
        console.log('Loaded rundowns:', data)
        setSavedRundowns(data || [])
      }
    } catch (error) {
      console.error('Unexpected error loading rundowns:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading rundowns',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const saveRundown = async (title: string, items: RundownItem[], columnConfig?: Column[]) => {
    if (!user) {
      console.error('Save rundown: No user found');
      toast({
        title: 'Error',
        description: 'You must be logged in to save rundowns',
        variant: 'destructive',
      });
      throw new Error('No user found');
    }

    console.log('Saving new rundown:', { title, itemsCount: items.length, columnConfig })
    
    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        items,
        is_archived: false,
        ...(columnConfig && { column_config: columnConfig })
      }

      console.log('Save payload:', payload);

      const { data, error } = await supabase
        .from('rundowns')
        .insert(payload)
        .select()
        .single()

      if (error) {
        console.error('Error saving rundown:', error)
        toast({
          title: 'Error',
          description: `Failed to save rundown: ${error.message}`,
          variant: 'destructive',
        })
        throw error
      } else {
        console.log('Rundown saved successfully:', data)
        toast({
          title: 'Success',
          description: 'Rundown saved successfully!',
        })
        await loadRundowns()
        return data
      }
    } catch (error) {
      console.error('Unexpected error saving rundown:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while saving the rundown',
        variant: 'destructive',
      });
      throw error;
    }
  }

  const updateRundown = async (id: string, title: string, items: RundownItem[], silent = false, columnConfig?: Column[]) => {
    if (!user) {
      console.error('Update rundown: No user found');
      if (!silent) {
        toast({
          title: 'Error',
          description: 'You must be logged in to update rundowns',
          variant: 'destructive',
        });
      }
      throw new Error('No user found');
    }

    console.log('Updating rundown:', { id, title, itemsCount: items.length, silent, columnConfig })

    try {
      const payload = {
        title: title.trim(),
        items,
        updated_at: new Date().toISOString(),
        ...(columnConfig && { column_config: columnConfig })
      }

      console.log('Update payload:', payload);

      const { error } = await supabase
        .from('rundowns')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating rundown:', error)
        if (!silent) {
          toast({
            title: 'Error',
            description: `Failed to update rundown: ${error.message}`,
            variant: 'destructive',
          })
        }
        throw error
      } else {
        console.log('Rundown updated successfully')
        if (!silent) {
          toast({
            title: 'Success',
            description: 'Rundown updated successfully!',
          })
        }
        await loadRundowns()
      }
    } catch (error) {
      console.error('Unexpected error updating rundown:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while updating the rundown',
          variant: 'destructive',
        });
      }
      throw error;
    }
  }

  const archiveRundown = async (id: string) => {
    if (!user) return

    console.log('Archiving rundown:', id)
    const { error } = await supabase
      .from('rundowns')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error archiving rundown:', error)
      toast({
        title: 'Error',
        description: 'Failed to archive rundown',
        variant: 'destructive',
      })
    } else {
      console.log('Rundown archived successfully')
      toast({
        title: 'Success',
        description: 'Rundown archived successfully!',
      })
      loadRundowns()
    }
  }

  const unarchiveRundown = async (id: string) => {
    if (!user) return

    console.log('Unarchiving rundown:', id)
    const { error } = await supabase
      .from('rundowns')
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error unarchiving rundown:', error)
      toast({
        title: 'Error',
        description: 'Failed to unarchive rundown',
        variant: 'destructive',
      })
    } else {
      console.log('Rundown unarchived successfully')
      toast({
        title: 'Success',
        description: 'Rundown unarchived successfully!',
      })
      loadRundowns()
    }
  }

  const deleteRundown = async (id: string) => {
    if (!user) return

    console.log('Deleting rundown:', id)
    const { error } = await supabase
      .from('rundowns')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting rundown:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete rundown',
        variant: 'destructive',
      })
    } else {
      console.log('Rundown deleted successfully')
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

  // Filter active and archived rundowns
  const activeRundowns = savedRundowns.filter(r => !r.is_archived)
  const archivedRundowns = savedRundowns.filter(r => r.is_archived)

  return {
    savedRundowns,
    activeRundowns,
    archivedRundowns,
    loading,
    saveRundown,
    updateRundown,
    deleteRundown,
    archiveRundown,
    unarchiveRundown,
    loadRundowns,
  }
}
