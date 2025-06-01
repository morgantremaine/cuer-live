
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Mail, Trash2, UserPlus, UserMinus } from 'lucide-react'
import { useTeamManagement, Team } from '@/hooks/useTeamManagement'

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
  } = useTeamManagement()

  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteUser, setShowInviteUser] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [deletingTeam, setDeletingTeam] = useState(false)

  const currentUserRole = getCurrentUserRole()
  const isOwner = currentUserRole === 'owner'
  const isAdmin = currentUserRole === 'admin' || isOwner

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return

    setCreating(true)
    const team = await createTeam(newTeamName.trim())
    if (team) {
      setNewTeamName('')
      setShowCreateTeam(false)
      setCurrentTeam(team)
    }
    setCreating(false)
  }

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !currentTeam) return

    setInviting(true)
    await inviteUserToTeam(currentTeam.id, inviteEmail.trim())
    setInviteEmail('')
    setShowInviteUser(false)
    setInviting(false)
  }

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMember(memberId)
    await removeTeamMember(memberId)
    setRemovingMember(null)
  }

  const handleDeleteTeam = async () => {
    if (!currentTeam) return
    
    setDeletingTeam(true)
    await deleteTeam(currentTeam.id)
    setDeletingTeam(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
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
            
            {isOwner && currentTeam && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
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
                      disabled={deletingTeam}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deletingTeam ? 'Deleting...' : 'Delete Team'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
            {/* Team Selector */}
            <div>
              <Label htmlFor="team-select">Current Team</Label>
              <Select
                value={currentTeam?.id || ''}
                onValueChange={(value) => {
                  const team = teams.find(t => t.id === value)
                  if (team) setCurrentTeam(team)
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

            {currentTeam && (
              <>
                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Team Members ({teamMembers.length})</h4>
                    {isAdmin && (
                      <Dialog open={showInviteUser} onOpenChange={setShowInviteUser}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
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
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setShowInviteUser(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleInviteUser} disabled={inviting || !inviteEmail.trim()}>
                                {inviting ? 'Sending...' : 'Send Invitation'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <div className="font-medium">
                            {member.email}
                          </div>
                          <div className="text-sm text-gray-500">
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
                                    Are you sure you want to remove {member.email} from the team?
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
                    ))}
                  </div>
                </div>

                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
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
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TeamManagement
