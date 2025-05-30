
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
    if (!user) return

    const { data, error } = await supabase
      .from('rundowns')
      .insert({
        user_id: user.id,
        title,
        items,
        columns,
      })
      .select()
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save rundown',
        variant: 'destructive',
      })
      throw error
    } else {
      toast({
        title: 'Success',
        description: 'Rundown saved successfully!',
      })
      loadRundowns()
      return data
    }
  }

  const updateRundown = async (id: string, title: string, items: RundownItem[], columns?: Column[], silent = false) => {
    if (!user) return

    const { error } = await supabase
      .from('rundowns')
      .update({
        title,
        items,
        columns,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to update rundown',
          variant: 'destructive',
        })
      }
      throw error
    } else {
      if (!silent) {
        toast({
          title: 'Success',
          description: 'Rundown updated successfully!',
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
