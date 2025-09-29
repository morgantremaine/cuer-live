
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Column } from '@/types/columns'
import { useActiveTeam } from '@/hooks/useActiveTeam'

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
  const { activeTeamId } = useActiveTeam()

  const loadLayouts = async () => {
    if (!user || !activeTeamId) return

    setLoading(true)
    try {
      // Load layouts for the active team only (both user's own and team-shared layouts)
      const { data: layoutsData, error } = await supabase
        .from('column_layouts')
        .select('*')
        .or(`and(user_id.eq.${user.id},team_id.eq.${activeTeamId}),and(team_id.eq.${activeTeamId},user_id.neq.${user.id})`)
        .order('updated_at', { ascending: false })

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load column layouts',
          variant: 'destructive',
        })
        console.error('Error loading layouts:', error)
        setLoading(false)
        return
      }

      // Get unique user IDs from the layouts to fetch their profiles
      const userIds = [...new Set((layoutsData || []).map(layout => layout.user_id))]
      
      let profilesData = []
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

        if (profilesError) {
          console.error('Error loading profiles:', profilesError)
          // Continue without profile data instead of failing
        } else {
          profilesData = profiles || []
        }
      }

      // Map the data to include creator profile information
      const mappedLayouts = (layoutsData || []).map(layout => {
        const creatorProfile = profilesData.find(p => p.id === layout.user_id)
        return {
          ...layout,
          creator_profile: creatorProfile ? {
            full_name: creatorProfile.full_name,
            email: creatorProfile.email
          } : null
        }
      })
      
      setSavedLayouts(mappedLayouts)
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
      // Use the active team from the team switcher
      const teamId = activeTeamId

      // Save only visible columns to preserve exact layout state
      const visibleColumns = columns.filter(col => col.isVisible !== false)
      console.log('💾 Saving layout with', visibleColumns.length, 'visible columns out of', columns.length, 'total')

      const { data, error } = await supabase
        .from('column_layouts')
        .insert({
          user_id: user.id,
          team_id: teamId,
          name,
          columns: visibleColumns, // Save only visible columns
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

    // Save only visible columns to preserve exact layout state  
    const visibleColumns = columns.filter(col => col.isVisible !== false)
    console.log('🔄 useColumnLayoutStorage: Updating layout', id)
    console.log('📊 Input columns:', columns.length, 'total, filtering to', visibleColumns.length, 'visible')
    console.log('📋 Visible columns being saved:', visibleColumns.map(c => ({ id: c.id, name: c.name, width: c.width })))

    // Safety check: prevent saving empty layouts
    if (visibleColumns.length === 0) {
      console.error('❌ Cannot update layout with 0 visible columns')
      toast({
        title: 'Error',
        description: 'Cannot update layout - no visible columns found',
        variant: 'destructive',
      })
      return
    }

    const { data, error } = await supabase
      .from('column_layouts')
      .update({
        name,
        columns: visibleColumns, // Update with only visible columns
        updated_at: new Date().toISOString() // Force timestamp update for cache invalidation
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
  
    if (error) {
      console.error('❌ Database error updating layout:', error)
      toast({
        title: 'Error',
        description: 'Failed to update column layout',
        variant: 'destructive',
      })
      throw error
    } else {
      console.log('✅ Database update successful:', data)
      toast({
        title: 'Success',
        description: `Layout "${name}" updated with ${visibleColumns.length} columns!`,
      })
      
      // Force immediate cache invalidation and reload
      setSavedLayouts(prev => prev.map(layout => 
        layout.id === id 
          ? { ...layout, columns: visibleColumns, name, updated_at: new Date().toISOString() }
          : layout
      ))
      
      console.log('🔄 Cache invalidated, reloading layouts from database')
      // Reload layouts to ensure consistency
      await loadLayouts()
      return data
    }
  }

  const renameLayout = async (id: string, newName: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('column_layouts')
      .update({
        name: newName
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
    if (user && activeTeamId) {
      loadLayouts()
    }
  }, [user, activeTeamId]) // Reload when team changes

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
