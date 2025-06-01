
import { useAuth } from '@/hooks/useAuth'
import { useTeamData } from './team/useTeamData'
import { useTeamActions } from './team/useTeamActions'

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
  const { user } = useAuth()
  const {
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
  } = useTeamData()

  const {
    createTeam,
    inviteUserToTeam,
    removeTeamMember: removeTeamMemberAction,
    deleteTeam: deleteTeamAction,
    acceptInvitation: acceptInvitationAction,
  } = useTeamActions(loadTeams, loadTeamMembers, loadPendingInvitations)

  const removeTeamMember = async (memberId: string) => {
    await removeTeamMemberAction(memberId)
    if (currentTeam) {
      loadTeamMembers(currentTeam.id)
    }
  }

  const deleteTeam = async (teamId: string) => {
    await deleteTeamAction(teamId, teamMembers)
    if (currentTeam?.id === teamId) {
      const remainingTeams = teams.filter(t => t.id !== teamId)
      setCurrentTeam(remainingTeams.length > 0 ? remainingTeams[0] : null)
    }
  }

  const acceptInvitation = async (invitationId: string) => {
    await acceptInvitationAction(invitationId)
    // Reload teams and switch to the newly joined team
    await loadTeams()
    if (currentTeam) {
      loadPendingInvitations(currentTeam.id)
    }
  }

  const getCurrentUserRole = () => {
    if (!user || !currentTeam) return null
    const currentUserMembership = teamMembers.find(member => member.user_id === user.id)
    return currentUserMembership?.role || null
  }

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
    acceptInvitation,
    getCurrentUserRole,
    loadTeams,
  }
}
