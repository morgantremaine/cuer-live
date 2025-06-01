
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

interface CreateTeamDialogProps {
  onCreateTeam: (name: string) => Promise<any>
}

const CreateTeamDialog = ({ onCreateTeam }: CreateTeamDialogProps) => {
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return

    setCreating(true)
    const team = await onCreateTeam(newTeamName.trim())
    if (team) {
      setNewTeamName('')
      setShowCreateTeam(false)
    }
    setCreating(false)
  }

  return (
    <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to collaborate with others on rundowns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={creating || !newTeamName.trim()}>
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTeamDialog
