
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Team, TeamMember, TeamInvitation } from '@/hooks/useTeamManagement'

export const useTeamData = () => {
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadTeams = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('teams')
      .select('*')

    if (error) {
      console.error('Error loading teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      })
    } else {
      setTeams(data || [])
      if (data && data.length > 0 && !currentTeam) {
        setCurrentTeam(data[0])
      }
    }
    setLoading(false)
  }

  const loadTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)

    if (error) {
      console.error('Error loading team members:', error)
    } else {
      const membersWithEmails = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', member.user_id)
          
          let email = member.user_id
          let fullName = null
          
          if (profileData && profileData.length > 0) {
            email = profileData[0].email
            fullName = profileData[0].full_name
          } else {
            if (user && member.user_id === user.id && user.email) {
              email = user.email
            }
          }
          
          return {
            ...member,
            email,
            profiles: profileData && profileData.length > 0 ? {
              email: profileData[0].email,
              full_name: profileData[0].full_name
            } : undefined
          }
        })
      )
      
      setTeamMembers(membersWithEmails)
    }
  }

  const loadPendingInvitations = async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Error loading invitations:', error)
    } else {
      setPendingInvitations(data || [])
    }
  }

  useEffect(() => {
    if (user) {
      loadTeams()
    }
  }, [user])

  useEffect(() => {
    if (currentTeam) {
      loadTeamMembers(currentTeam.id)
      loadPendingInvitations(currentTeam.id)
    }
  }, [currentTeam])

  return {
    teams,
    setTeams,
    currentTeam,
    setCurrentTeam,
    teamMembers,
    setTeamMembers,
    pendingInvitations,
    setPendingInvitations,
    loading,
    loadTeams,
    loadTeamMembers,
    loadPendingInvitations,
  }
}
