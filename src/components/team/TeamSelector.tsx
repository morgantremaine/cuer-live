
import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Team } from '@/hooks/useTeamManagement'

interface TeamSelectorProps {
  teams: Team[]
  currentTeam: Team | null
  onTeamChange: (team: Team) => void
}

const TeamSelector = ({ teams, currentTeam, onTeamChange }: TeamSelectorProps) => {
  return (
    <div>
      <Label htmlFor="team-select">Current Team</Label>
      <Select
        value={currentTeam?.id || ''}
        onValueChange={(value) => {
          const team = teams.find(t => t.id === value)
          if (team) onTeamChange(team)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a team" />
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
  )
}

export default TeamSelector
