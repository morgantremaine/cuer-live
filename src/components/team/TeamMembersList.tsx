
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { UserMinus } from 'lucide-react'
import { TeamMember } from '@/hooks/useTeamManagement'

interface TeamMembersListProps {
  teamMembers: TeamMember[]
  isOwner: boolean
  onRemoveMember: (memberId: string) => Promise<void>
}

const TeamMembersList = ({ teamMembers, isOwner, onRemoveMember }: TeamMembersListProps) => {
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMember(memberId)
    await onRemoveMember(memberId)
    setRemovingMember(null)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  console.log('Rendering team members list:', teamMembers)

  return (
    <div className="space-y-2">
      {teamMembers.map((member) => {
        const displayEmail = member.email || member.user_id
        const displayName = member.profiles?.full_name || displayEmail
        
        console.log('Rendering member:', {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          email: member.email,
          displayEmail,
          displayName
        })
        
        return (
          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="font-medium">
                {displayName}
              </div>
              {member.profiles?.full_name && (
                <div className="text-sm text-gray-500">
                  {displayEmail}
                </div>
              )}
              <div className="text-xs text-gray-400">
                Joined: {new Date(member.joined_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getRoleBadgeColor(member.role)}>
                {member.role}
              </Badge>
              {isOwner && member.role !== 'owner' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={removingMember === member.id}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove {displayEmail} from the team?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleRemoveMember(member.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TeamMembersList
