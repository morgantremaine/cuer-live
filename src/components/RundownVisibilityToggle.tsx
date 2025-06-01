
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Lock, Users, Globe } from 'lucide-react'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useTeamManagement } from '@/hooks/useTeamManagement'

interface RundownVisibilityToggleProps {
  rundownId: string
  currentVisibility: 'private' | 'team'
  currentTeamId?: string | null
  onVisibilityChange?: () => void
}

const RundownVisibilityToggle = ({ 
  rundownId, 
  currentVisibility, 
  currentTeamId,
  onVisibilityChange 
}: RundownVisibilityToggleProps) => {
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId || '')
  const [updating, setUpdating] = useState(false)
  const { updateRundownVisibility } = useRundownStorage()
  const { teams } = useTeamManagement()

  const handleVisibilityClick = () => {
    if (currentVisibility === 'private') {
      // If currently private and user wants to make it team, show team selection
      if (teams.length > 0) {
        setShowDialog(true)
      }
    } else {
      // If currently team, make it private
      handleUpdateVisibility('private', null)
    }
  }

  const handleUpdateVisibility = async (visibility: 'private' | 'team', teamId: string | null) => {
    setUpdating(true)
    try {
      await updateRundownVisibility(rundownId, visibility, teamId)
      setShowDialog(false)
      onVisibilityChange?.()
    } catch (error) {
      console.error('Failed to update visibility:', error)
    }
    setUpdating(false)
  }

  const handleMakeTeamRundown = async () => {
    if (!selectedTeamId) return
    await handleUpdateVisibility('team', selectedTeamId)
  }

  const getIcon = () => {
    return currentVisibility === 'private' ? 
      <Lock className="h-4 w-4" /> : 
      <Users className="h-4 w-4" />
  }

  const getLabel = () => {
    return currentVisibility === 'private' ? 'Private' : 'Team'
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleVisibilityClick}
        disabled={updating}
        className="flex items-center space-x-1"
      >
        {getIcon()}
        <span>{getLabel()}</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-select">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMakeTeamRundown} 
                disabled={!selectedTeamId || updating}
              >
                {updating ? 'Updating...' : 'Share with Team'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RundownVisibilityToggle
