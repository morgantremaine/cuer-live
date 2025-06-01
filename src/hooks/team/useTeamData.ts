
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface Team {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface TeamInvitation {
  id: string
  email: string
  team_id: string
  token: string
  expires_at: string
  accepted: boolean
  created_at: string
}

export const useTeamData = () => {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(false)

  const loadPendingInvitations = useCallback(async () => {
    if (!user?.email || loading) {
      return
    }

    try {
      setLoading(true)
      console.log('Loading pending invitations for user email:', user.email)
      
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('email', user.email)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())

      if (error) {
        console.error('Error loading pending invitations:', error)
        return
      }

      console.log('Found pending invitations:', data || [])
      setPendingInvitations(data || [])
    } catch (error) {
      console.error('Error in loadPendingInvitations:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.email, loading])

  const loadTeams = useCallback(async () => {
    if (!user?.id) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team:teams (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading teams:', error)
        return
      }

      const teamList = data?.map(item => item.team).filter(Boolean) as Team[]
      setTeams(teamList || [])
    } catch (error) {
      console.error('Error in loadTeams:', error)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      loadPendingInvitations()
      loadTeams()
    }
  }, [user, loadPendingInvitations, loadTeams])

  return {
    teams,
    pendingInvitations,
    loading,
    loadPendingInvitations,
    loadTeams
  }
}
