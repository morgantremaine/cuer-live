
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
  user_id: string
  team_id?: string
  creator_profile?: {
    full_name: string | null
    email: string
  }
}

export const useColumnLayoutStorage = () => {
  const [savedLayouts, setSavedLayouts] = useState<ColumnLayout[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadLayouts = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get user's team memberships first
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

      if (teamError) {
        console.error('Error loading team memberships:', teamError)
        setLoading(false)
        return
      }

      const teamIds = teamMemberships?.map(membership => membership.team_id) || []

      // Load layouts that user can access (own layouts + team layouts)
      const { data: layoutsData, error } = await supabase
        .from('column_layouts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .or(`user_id.eq.${user.id},team_id.in.(${teamIds.join(',')})`)
        .order('updated_at', { ascending: false })

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load column layouts',
          variant: 'destructive',
        })
        console.error('Error loading layouts:', error)
      } else {
        // Map the data to include creator profile information
        const mappedLayouts = (layoutsData || []).map(layout => ({
          ...layout,
          creator_profile: layout.profiles ? {
            full_name: layout.profiles.full_name,
            email: layout.profiles.email
          } : null
        }))
        setSavedLayouts(mappedLayouts)
      }
    } catch (error) {
      console.error('Error in loadLayouts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load column layouts',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const saveLayout = async (name: string, columns: Column[], isDefault = false) => {
    if (!user) return

    try {
      // Get user's first team for new layouts
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)

      const teamId = teamMemberships?.[0]?.team_id || null

      const { data, error } = await supabase
        .from('column_layouts')
        .insert({
          user_id: user.id,
          team_id: teamId,
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
    } catch (error) {
      console.error('Error saving layout:', error)
      throw error
    }
  }

  const updateLayout = async (id: string, name: string, columns: Column[]) => {
    if (!user) return

    const { data, error } = await supabase
      .from('column_layouts')
      .update({
        name,
        columns,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update column layout',
        variant: 'destructive',
      })
      throw error
    } else {
      toast({
        title: 'Success',
        description: 'Column layout updated successfully!',
      })
      loadLayouts()
      return data
    }
  }

  const renameLayout = async (id: string, newName: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('column_layouts')
      .update({
        name: newName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename column layout',
        variant: 'destructive',
      })
      throw error
    } else {
      toast({
        title: 'Success',
        description: 'Column layout renamed successfully!',
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

  // Helper function to check if user can edit a layout
  const canEditLayout = (layout: ColumnLayout) => {
    return layout.user_id === user?.id
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
    updateLayout,
    renameLayout,
    deleteLayout,
    loadLayouts,
    canEditLayout,
  }
}
