
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'

interface InviteUserDialogProps {
  onInviteUser: (email: string) => Promise<void>
  isOwner: boolean
}

const InviteUserDialog = ({ onInviteUser, isOwner }: InviteUserDialogProps) => {
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !isOwner) return

    setInviting(true)
    await onInviteUser(inviteEmail.trim())
    setInviteEmail('')
    setShowInviteUser(false)
    setInviting(false)
  }

  return (
    <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline"
          disabled={!isOwner}
          className={!isOwner ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User to Team</DialogTitle>
          <DialogDescription>
            Send an invitation to a user to join your team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter user's email"
              disabled={!isOwner}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowInviteUser(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteUser} 
              disabled={inviting || !inviteEmail.trim() || !isOwner}
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InviteUserDialog
