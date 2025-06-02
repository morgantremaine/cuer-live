
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'
import { useToast } from '@/hooks/use-toast'
import { SavedRundown } from './useRundownStorage/types'
import { mapRundownsFromDatabase } from './useRundownStorage/dataMapper'
import {
  loadRundownsFromDatabase,
  saveRundownToDatabase,
  updateRundownInDatabase,
  deleteRundownFromDatabase
} from './useRundownStorage/operations'

export const useRundownStorage = () => {
  const [savedRundowns, setSavedRundowns] = useState<SavedRundown[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const hasLoadedRef = useRef(false)

  const loadRundowns = async () => {
    if (!user || loading) return

    setLoading(true)
    const { data, error } = await loadRundownsFromDatabase(user.id)

    if (error) {
      console.error('Error loading rundowns:', error)
      toast({
        title: 'Error',
        description: 'Failed to load rundowns',
        variant: 'destructive',
      })
    } else {
      const mappedData = mapRundownsFromDatabase(data)
      setSavedRundowns(mappedData)
      hasLoadedRef.current = true
    }
    setLoading(false)
  }

  const saveRundown = async (title: string, items: RundownItem[], columns?: Column[], timezone?: string, startTime?: string, icon?: string) => {
    if (!user) {
      console.error('Cannot save: no user')
      return
    }

    const { data, error } = await saveRundownToDatabase(user.id, title, items, columns, timezone, startTime, icon)

    if (error) {
      console.error('Database error saving rundown:', error)
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

  const updateRundown = async (id: string, title: string, items: RundownItem[], silent = false, archived = false, columns?: Column[], timezone?: string, startTime?: string, icon?: string) => {
    if (!user) {
      console.error('Cannot update: no user')
      return
    }

    const { error, data } = await updateRundownInDatabase(id, user.id, title, items, archived, columns, timezone, startTime, icon)

    if (error) {
      console.error('Database error updating rundown:', {
        error,
        errorMessage: error.message,
        id,
        userId: user.id
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
      if (!silent) {
        const message = archived ? 'Rundown archived successfully!' : 'Rundown updated successfully!'
        toast({
          title: 'Success',
          description: message,
        })
      }
      // Refresh data to ensure consistency
      loadRundowns()
    }
  }

  const deleteRundown = async (id: string) => {
    if (!user) return

    const { error } = await deleteRundownFromDatabase(id, user.id)

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

  // Load rundowns only once when user becomes available
  useEffect(() => {
    if (user && !hasLoadedRef.current && !loading) {
      loadRundowns()
    }
  }, [user?.id])

  // Reset loading state when user changes
  useEffect(() => {
    if (!user) {
      hasLoadedRef.current = false
      setSavedRundowns([])
    }
  }, [user?.id])

  return {
    savedRundowns,
    loading,
    saveRundown,
    updateRundown,
    deleteRundown,
    loadRundowns,
  }
}
