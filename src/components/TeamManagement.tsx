import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Crown, User, Users, Mail, X, AlertTriangle, Loader2 } from 'lucide-react';
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

interface TransferPreview {
  member_email: string;
  member_name: string | null;
  rundown_count: number;
  blueprint_count: number;
  will_delete_account: boolean;
}

const TeamManagement = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [transferPreview, setTransferPreview] = useState<TransferPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [teamAdminName, setTeamAdminName] = useState<string>('');
  
  const {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    error,
    inviteTeamMember,
    removeTeamMemberWithTransfer,
    getTransferPreview,
    revokeInvitation
  } = useTeam();
  
  const { toast } = useToast();

  // Get the admin's name from team members
  useEffect(() => {
    if (teamMembers.length > 0) {
      const admin = teamMembers.find(member => member.role === 'admin');
      if (admin?.profiles?.full_name) {
        setTeamAdminName(admin.profiles.full_name);
      } else if (admin?.profiles?.email) {
        // Fallback to email if no full name
        setTeamAdminName(admin.profiles.email.split('@')[0]);
      }
    }
  }, [teamMembers]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    console.log('Inviting team member:', inviteEmail.trim());
    setIsInviting(true);
    
    try {
      const { error } = await inviteTeamMember(inviteEmail.trim());
      
      if (error) {
        console.error('Error inviting team member:', error);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
      } else {
        console.log('Team member invited successfully');
        toast({
          title: 'Success',
          description: 'Invitation sent successfully!',
        });
        setInviteEmail('');
      }
    } catch (err) {
      console.error('Unexpected error inviting team member:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while sending the invitation.',
        variant: 'destructive',
      });
    }
    
    setIsInviting(false);
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

  const handleRemoveMemberClick = async (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setIsLoadingPreview(true);
    
    const { data, error } = await getTransferPreview(memberId);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      setMemberToRemove(null);
    } else {
      setTransferPreview(data);
    }
    
    setIsLoadingPreview(false);
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    const { error, result } = await removeTeamMemberWithTransfer(memberToRemove.id);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      const transferredItems = [];
      if (result?.rundownsTransferred > 0) {
        transferredItems.push(`${result.rundownsTransferred} rundown${result.rundownsTransferred > 1 ? 's' : ''}`);
      }
      if (result?.blueprintsTransferred > 0) {
        transferredItems.push(`${result.blueprintsTransferred} blueprint${result.blueprintsTransferred > 1 ? 's' : ''}`);
      }
      
      const transferMessage = transferredItems.length > 0 
        ? ` ${transferredItems.join(' and ')} transferred to you.`
        : '';
      
      toast({
        title: 'Team member removed',
        description: `${memberToRemove.name} has been removed from the team and their account deleted.${transferMessage}`,
      });
    }
    
    setIsRemoving(false);
    setMemberToRemove(null);
    setTransferPreview(null);
  };

  const handleCancelRemoveMember = () => {
    setMemberToRemove(null);
    setTransferPreview(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Error Loading Team
            </CardTitle>
            <CardDescription className="text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
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

  const displayTeamName = teamAdminName ? `${teamAdminName}'s Team` : team.name;

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5" />
            {displayTeamName}
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
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No team members found. Try refreshing the page.</p>
            </div>
          ) : (
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-300 hover:text-white hover:bg-gray-600"
                        onClick={() => handleRemoveMemberClick(
                          member.id, 
                          member.profiles?.full_name || member.profiles?.email || 'Unknown User'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && handleCancelRemoveMember()}>
        <AlertDialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Remove Team Member
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-3">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading transfer details...
                </div>
              ) : transferPreview ? (
                <div className="space-y-3">
                  <p>
                    <strong>⚠️ This action cannot be undone.</strong>
                  </p>
                  <p>
                    You are about to remove <strong>{transferPreview.member_name || transferPreview.member_email}</strong> from the team.
                  </p>
                  
                  <div className="bg-gray-700 p-3 rounded border-l-4 border-red-500">
                    <p className="font-semibold text-red-400 mb-2">What will happen:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Their account will be permanently deleted</li>
                      {transferPreview.rundown_count > 0 && (
                        <li>• {transferPreview.rundown_count} rundown{transferPreview.rundown_count > 1 ? 's' : ''} will be transferred to you</li>
                      )}
                      {transferPreview.blueprint_count > 0 && (
                        <li>• {transferPreview.blueprint_count} blueprint{transferPreview.blueprint_count > 1 ? 's' : ''} will be transferred to you</li>
                      )}
                      <li>• They will lose access to all team data</li>
                    </ul>
                  </div>
                  
                  <p className="text-sm text-gray-400">
                    All their rundowns and blueprints will be safely transferred to you before their account is deleted.
                  </p>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500"
              disabled={isRemoving}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemoveMember}
              disabled={isLoadingPreview || isRemoving || !transferPreview}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                'Remove Member & Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamManagement;
