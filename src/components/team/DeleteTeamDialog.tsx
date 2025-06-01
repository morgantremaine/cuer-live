
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { Team } from '@/hooks/useTeamManagement'

interface DeleteTeamDialogProps {
  currentTeam: Team | null
  onDeleteTeam: (teamId: string) => Promise<void>
  isOwner: boolean
}

const DeleteTeamDialog = ({ currentTeam, onDeleteTeam, isOwner }: DeleteTeamDialogProps) => {
  const [deletingTeam, setDeletingTeam] = useState(false)

  const handleDeleteTeam = async () => {
    if (!currentTeam || !isOwner) return
    
    setDeletingTeam(true)
    await onDeleteTeam(currentTeam.id)
    setDeletingTeam(false)
  }

  if (!currentTeam) return null

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          size="sm" 
          variant="destructive"
          disabled={!isOwner}
          className={!isOwner ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Team
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{currentTeam.name}"? This action cannot be undone and will remove all team members and associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteTeam}
            disabled={deletingTeam || !isOwner}
            className="bg-red-600 hover:bg-red-700"
          >
            {deletingTeam ? 'Deleting...' : 'Delete Team'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteTeamDialog
