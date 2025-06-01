
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
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
    
    // Get teams where user is a member
    const { data: memberTeams, error: memberError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams!inner(*)
      `)
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error loading teams:', memberError)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      })
    } else {
      const teams = memberTeams?.map(mt => mt.teams).filter(Boolean) || []
      setTeams(teams)
      if (teams.length > 0 && !currentTeam) {
        setCurrentTeam(teams[0])
      }
    }
    setLoading(false)
  }

  const loadTeamMembers = async (teamId: string) => {
    console.log('Loading team members for team:', teamId)
    
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        profiles(email, full_name)
      `)
      .eq('team_id', teamId)

    if (error) {
      console.error('Error loading team members:', error)
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      })
    } else {
      console.log('Raw team members data:', data)
      
      const membersWithEmails = (data || []).map((member) => {
        let email = member.user_id
        let fullName = null
        
        // Try to get email from profiles
        if (member.profiles) {
          email = member.profiles.email
          fullName = member.profiles.full_name
        } else if (user && member.user_id === user.id && user.email) {
          // Fallback to current user's email if it's the current user
          email = user.email
        }
        
        console.log('Processing member:', {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          email,
          fullName
        })
        
        return {
          ...member,
          email,
          profiles: member.profiles ? {
            email: member.profiles.email,
            full_name: member.profiles.full_name
          } : undefined
        }
      })
      
      console.log('Processed team members:', membersWithEmails)
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
