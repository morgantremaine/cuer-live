
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { TeamMember } from '@/hooks/useTeamManagement'

export const useTeamActions = (
  loadTeams: () => Promise<void>,
  loadTeamMembers: (teamId: string) => Promise<void>,
  loadPendingInvitations: (teamId: string) => Promise<void>
) => {
  const { user } = useAuth()
  const { toast } = useToast()

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
      if (error.code === '23505') {
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

    loadPendingInvitations(teamId)
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
  }

  const deleteTeam = async (teamId: string, teamMembers: TeamMember[]) => {
    if (!user) return

    const currentUserMembership = teamMembers.find(member => member.user_id === user.id)
    if (currentUserMembership?.role !== 'owner') {
      toast({
        title: 'Error',
        description: 'Only team owners can delete teams',
        variant: 'destructive',
      })
      return
    }

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

    const { error: invitationsError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('team_id', teamId)

    if (invitationsError) {
      console.warn('Error deleting invitations:', invitationsError)
    }

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

    await loadTeams()
  }

  return {
    createTeam,
    inviteUserToTeam,
    removeTeamMember,
    deleteTeam,
  }
}
