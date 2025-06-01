import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { useTeamManagement } from '@/hooks/useTeamManagement'
import CreateTeamDialog from './team/CreateTeamDialog'
import DeleteTeamDialog from './team/DeleteTeamDialog'
import TeamSelector from './team/TeamSelector'
import TeamMembersList from './team/TeamMembersList'
import InviteUserDialog from './team/InviteUserDialog'
import PendingInvitationsList from './team/PendingInvitationsList'

const TeamManagement = () => {
  const {
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
    acceptInvitation,
  } = useTeamManagement()

  const currentUserRole = getCurrentUserRole()
  const isOwner = currentUserRole === 'owner'
  const isAdmin = currentUserRole === 'admin' || isOwner

  const handleInviteUser = async (email: string) => {
    if (!currentTeam) return
    await inviteUserToTeam(currentTeam.id, email)
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptInvitation(invitationId)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Management
          </CardTitle>
          <div className="flex gap-2">
            <CreateTeamDialog onCreateTeam={createTeam} />
            {currentTeam && (
              <DeleteTeamDialog 
                currentTeam={currentTeam} 
                onDeleteTeam={deleteTeam}
                isOwner={isOwner}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No teams yet</h3>
            <p className="text-gray-500 mb-4">Create a team to collaborate with others</p>
          </div>
        ) : (
          <div className="space-y-4">
            <TeamSelector 
              teams={teams} 
              currentTeam={currentTeam} 
              onTeamChange={setCurrentTeam} 
            />

            {currentTeam && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Team Members ({teamMembers.length})</h4>
                    <InviteUserDialog 
                      onInviteUser={handleInviteUser}
                      isOwner={isOwner}
                    />
                  </div>
                  <TeamMembersList 
                    teamMembers={teamMembers}
                    isOwner={isOwner}
                    onRemoveMember={removeTeamMember}
                  />
                </div>

                <PendingInvitationsList 
                  pendingInvitations={pendingInvitations} 
                  onAcceptInvitation={handleAcceptInvitation}
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TeamManagement
