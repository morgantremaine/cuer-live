
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Crown, User, Users, Mail } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const TeamManagement = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  
  const {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    createTeam,
    inviteTeamMember,
    removeTeamMember
  } = useTeam();
  
  const { toast } = useToast();

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setIsCreatingTeam(true);
    const { error } = await createTeam(teamName.trim());
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Team created successfully!',
      });
      setTeamName('');
    }
    setIsCreatingTeam(false);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    const { error } = await inviteTeamMember(inviteEmail.trim());
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Invitation sent successfully!',
      });
      setInviteEmail('');
    }
    setIsInviting(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await removeTeamMember(memberId);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Team member removed successfully!',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  // No team - show team creation
  if (!team) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Create Your Team
            </CardTitle>
            <CardDescription>
              Create a team to collaborate on rundowns with your colleagues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  required
                />
              </div>
              <Button type="submit" disabled={isCreatingTeam}>
                {isCreatingTeam ? 'Creating...' : 'Create Team'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has team - show team management
  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {team.name}
          </CardTitle>
          <CardDescription>
            Manage your team members and collaborate on rundowns.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Invite Members (Admin Only) */}
      {userRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Members
            </CardTitle>
            <CardDescription>
              Add new members to your team by sending email invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteMember} className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations (Admin Only) */}
      {userRole === 'admin' && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{invitation.email}</span>
                    <p className="text-sm text-gray-500">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Team Members ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown User'}
                      </span>
                      {member.role === 'admin' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {member.profiles?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {userRole === 'admin' && member.role !== 'admin' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.profiles?.full_name || member.profiles?.email} from the team?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
