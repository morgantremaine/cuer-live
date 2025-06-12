import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Crown, User, Users, Mail, X } from 'lucide-react';
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
  
  const {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    inviteTeamMember,
    removeTeamMember,
    revokeInvitation
  } = useTeam();
  
  const { toast } = useToast();

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

  const handleRevokeInvitation = async (invitationId: string) => {
    const { error } = await revokeInvitation(invitationId);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Invitation revoked successfully!',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Show team management interface - user should have a team now
  if (!team) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Team Setup
            </CardTitle>
            <CardDescription className="text-gray-400">
              Setting up your team... Please refresh the page if this persists.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            {team.name}
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage your team members and collaborate on rundowns. You have {userRole} access.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Invite Members (Admin Only) */}
      {userRole === 'admin' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5" />
              Invite Team Members
            </CardTitle>
            <CardDescription className="text-gray-400">
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
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  required
                />
              </div>
              <Button type="submit" disabled={isInviting} className="bg-blue-600 hover:bg-blue-700">
                {isInviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations (Admin Only) */}
      {userRole === 'admin' && pendingInvitations.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-700">
                  <div>
                    <span className="font-medium text-white">{invitation.email}</span>
                    <p className="text-sm text-gray-400">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-500 text-gray-300">Pending</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-600">
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Revoke Invitation</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-300">
                            Are you sure you want to revoke the invitation for {invitation.email}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5" />
            Team Members ({teamMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-700">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown User'}
                      </span>
                      {member.role === 'admin' && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {member.profiles?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className={member.role === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}>
                    {member.role}
                  </Badge>
                  {userRole === 'admin' && member.role !== 'admin' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-300">
                            Are you sure you want to remove {member.profiles?.full_name || member.profiles?.email} from the team?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
