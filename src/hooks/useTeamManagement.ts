

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface Team {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  email?: string
  profiles?: {
    email: string
    full_name: string | null
  }
}

export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  invited_by: string
  token: string
  accepted: boolean
  created_at: string
  expires_at: string
}

export const useTeamManagement = () => {
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
      // Get user emails for each member
      const membersWithEmails = await Promise.all(
        (data || []).map(async (member) => {
          // First try to get profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', member.user_id)
          
          let email = member.user_id // fallback to user_id
          let fullName = null
          
          if (profileData && profileData.length > 0) {
            // Profile exists, use its data
            email = profileData[0].email
            fullName = profileData[0].full_name
          } else {
            // No profile found, try to get auth user data
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(member.user_id)
            
            if (authUser?.user?.email && !authError) {
              email = authUser.user.email
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

  const createTeam = async (name: string) => {
    if (!user) return null

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name })
      .select()
      .single()

    if (teamError) {
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      })
      return null
    }

    // Add the creator as team owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner'
      })

    if (memberError) {
      toast({
        title: 'Error',
        description: 'Failed to add team owner',
        variant: 'destructive',
      })
      return null
    }

    toast({
      title: 'Success',
      description: 'Team created successfully!',
    })

    loadTeams()
    return team
  }

  const inviteUserToTeam = async (teamId: string, email: string) => {
    if (!user) return

    // Generate a unique token
    const token = crypto.randomUUID()

    const { error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        invited_by: user.id,
        token
      })

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: 'Error',
          description: 'User already invited to this team',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to send invitation',
          variant: 'destructive',
        })
      }
      return
    }

    toast({
      title: 'Success',
      description: `Invitation sent to ${email}`,
    })

    if (currentTeam?.id === teamId) {
      loadPendingInvitations(teamId)
    }
  }

  const removeTeamMember = async (memberId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Success',
      description: 'Team member removed successfully',
    })

    if (currentTeam) {
      loadTeamMembers(currentTeam.id)
    }
  }

  const deleteTeam = async (teamId: string) => {
    if (!user) return

    // Check if user is owner of the team
    const currentUserMembership = teamMembers.find(member => member.user_id === user.id)
    if (currentUserMembership?.role !== 'owner') {
      toast({
        title: 'Error',
        description: 'Only team owners can delete teams',
        variant: 'destructive',
      })
      return
    }

    // First delete all team members
    const { error: membersError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)

    if (membersError) {
      toast({
        title: 'Error',
        description: 'Failed to remove team members',
        variant: 'destructive',
      })
      return
    }

    // Delete all pending invitations
    const { error: invitationsError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('team_id', teamId)

    if (invitationsError) {
      console.warn('Error deleting invitations:', invitationsError)
    }

    // Finally delete the team
    const { error: teamError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (teamError) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Success',
      description: 'Team deleted successfully',
    })

    // Reload teams and reset current team if deleted
    await loadTeams()
    if (currentTeam?.id === teamId) {
      const remainingTeams = teams.filter(t => t.id !== teamId)
      setCurrentTeam(remainingTeams.length > 0 ? remainingTeams[0] : null)
    }
  }

  const getCurrentUserRole = () => {
    if (!user || !currentTeam) return null
    const currentUserMembership = teamMembers.find(member => member.user_id === user.id)
    return currentUserMembership?.role || null
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
    currentTeam,
    setCurrentTeam,
    teamMembers,
    pendingInvitations,
    loading,
    createTeam,
    inviteUserToTeam,
    removeTeamMember,
    deleteTeam,
    getCurrentUserRole,
    loadTeams,
  }
}
