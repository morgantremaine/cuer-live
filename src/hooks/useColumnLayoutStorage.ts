
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Column } from '@/hooks/useColumnsManager'

interface ColumnLayout {
  id: string
  name: string
  columns: Column[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export const useColumnLayoutStorage = () => {
  const [savedLayouts, setSavedLayouts] = useState<ColumnLayout[]>([])
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

    const { data, error } = await supabase
      .from('column_layouts')
      .insert({
        user_id: user.id,
        name,
        columns,
        is_default: isDefault,
      })
      .select()
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save column layout',
        variant: 'destructive',
      })
      throw error
    } else {
      toast({
        title: 'Success',
        description: 'Column layout saved successfully!',
      })
      loadLayouts()
      return data
    }
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

  useEffect(() => {
    if (user) {
      loadLayouts()
    }
  }, [user])

  return {
    savedLayouts,
    loading,
    saveLayout,
    deleteLayout,
    loadLayouts,
  }
}
