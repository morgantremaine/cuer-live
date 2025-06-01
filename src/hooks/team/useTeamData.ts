
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
    
    // First get team members
    const { data: teamMembersData, error: membersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)

    if (membersError) {
      console.error('Error loading team members:', membersError)
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      })
      return
    }

    // Then get profiles for each member
    const memberIds = teamMembersData?.map(member => member.user_id).filter(Boolean) || []
    
    let profilesData: any[] = []
    if (memberIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberIds)

      if (profilesError) {
        console.error('Error loading profiles:', profilesError)
      } else {
        profilesData = profiles || []
      }
    }

    // Combine the data
    const membersWithEmails = (teamMembersData || []).map((member) => {
      let email = member.user_id || ''
      let fullName = null
      
      // Find matching profile
      const profile = profilesData.find(p => p.id === member.user_id)
      if (profile) {
        email = profile.email || member.user_id || ''
        fullName = profile.full_name
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
        role: (member.role || 'member') as 'owner' | 'admin' | 'member',
        team_id: member.team_id || '',
        user_id: member.user_id || '',
        joined_at: member.joined_at || '',
        email,
        profiles: profile ? {
          email: profile.email || '',
          full_name: profile.full_name
        } : undefined
      }
    })
    
    console.log('Processed team members:', membersWithEmails)
    setTeamMembers(membersWithEmails)
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
