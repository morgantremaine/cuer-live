
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Mail } from 'lucide-react'
import { TeamInvitation } from '@/hooks/useTeamManagement'

interface PendingInvitationsListProps {
  pendingInvitations: TeamInvitation[]
}

const PendingInvitationsList = ({ pendingInvitations }: PendingInvitationsListProps) => {
  if (pendingInvitations.length === 0) return null

  return (
    <div>
      <h4 className="font-medium mb-3">Pending Invitations</h4>
      <div className="space-y-2">
        {pendingInvitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-yellow-600 mr-2" />
              <span>{invitation.email}</span>
            </div>
            <Badge variant="outline">Pending</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingInvitationsList
