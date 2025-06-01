
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Check } from 'lucide-react'
import { TeamInvitation } from '@/hooks/useTeamManagement'
import { useAuth } from '@/hooks/useAuth'

interface PendingInvitationsListProps {
  pendingInvitations: TeamInvitation[]
  onAcceptInvitation?: (invitationId: string) => Promise<void>
  showTeamNames?: boolean
}

const PendingInvitationsList = ({ 
  pendingInvitations, 
  onAcceptInvitation,
  showTeamNames = false 
}: PendingInvitationsListProps) => {
  const { user } = useAuth()
  
  if (pendingInvitations.length === 0) return null

  return (
    <div>
      <h4 className="font-medium mb-3">
        {showTeamNames ? 'Team Invitations' : 'Pending Invitations'}
      </h4>
      <div className="space-y-2">
        {pendingInvitations.map((invitation) => {
          const isForCurrentUser = user?.email === invitation.email
          
          return (
            <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-yellow-600 mr-2" />
                <div>
                  {showTeamNames && invitation.teams ? (
                    <div>
                      <div className="font-medium">{invitation.teams.name}</div>
                      <div className="text-sm text-gray-500">{invitation.email}</div>
                    </div>
                  ) : (
                    <span>{invitation.email}</span>
                  )}
                </div>
              </div>
              {isForCurrentUser && onAcceptInvitation ? (
                <Button 
                  size="sm" 
                  onClick={() => onAcceptInvitation(invitation.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Accept
                </Button>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PendingInvitationsList
