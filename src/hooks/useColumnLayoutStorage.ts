
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Column } from '@/hooks/useColumnsManager'
import { useToast } from '@/hooks/use-toast'

interface SavedColumnLayout {
  id: string
  name: string
  columns: Column[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export const useColumnLayoutStorage = () => {
  const [savedLayouts, setSavedLayouts] = useState<SavedColumnLayout[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadLayouts = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('column_layouts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load column layouts',
        variant: 'destructive',
      })
    } else {
      setSavedLayouts(data || [])
    }
    setLoading(false)
  }

  const saveLayout = async (name: string, columns: Column[], isDefault = false) => {
    if (!user) return

    // If setting as default, remove default from others
    if (isDefault) {
      await supabase
        .from('column_layouts')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const { error } = await supabase
      .from('column_layouts')
      .insert({
        user_id: user.id,
        name,
        columns,
        is_default: isDefault,
      })

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save column layout',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Column layout saved successfully!',
      })
      loadLayouts()
    }
  }

  const loadLayout = async (id: string): Promise<Column[] | null> => {
    if (!user) return null

    const { data, error } = await supabase
      .from('column_layouts')
      .select('columns')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load column layout',
        variant: 'destructive',
      })
      return null
    }

    return data.columns
  }

  const deleteLayout = async (id: string) => {
    if (!user) return

    const { error } = await supabase
      .from('column_layouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete column layout',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Column layout deleted successfully!',
      })
      loadLayouts()
    }
  }

  const getDefaultLayout = (): SavedColumnLayout | null => {
    return savedLayouts.find(layout => layout.is_default) || null
  }

  useEffect(() => {
    if (user) {
      loadLayouts()
    }
  }, [user])

  return {
    savedLayouts,
    loading,
    saveLayout,
    loadLayout,
    deleteLayout,
    getDefaultLayout,
    loadLayouts,
  }
}
