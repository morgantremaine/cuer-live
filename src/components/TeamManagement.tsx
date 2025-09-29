import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeam } from '@/hooks/useTeam';
import { useSubscription } from '@/hooks/useSubscription';
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
    isLoading,
    error,
    inviteTeamMember,
    removeTeamMemberWithTransfer,
    getTransferPreview,
    revokeInvitation
  } = useTeam();
  
  const { max_team_members } = useSubscription();
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Error Loading Team
            </CardTitle>
            <CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Setup
            </CardTitle>
            <CardDescription>
              Setting up your team... Please refresh the page if this persists.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const displayTeamName = teamAdminName ? `${teamAdminName}'s Team` : team.name;
  
  // Calculate current team usage (members + pending invitations)
  const currentUsage = teamMembers.length + pendingInvitations.length;
  const isAtLimit = currentUsage >= max_team_members;
  const canInviteMore = userRole === 'admin' && !isAtLimit;

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {displayTeamName}
          </CardTitle>
          <CardDescription>
            Manage your team members and collaborate on rundowns. You have {userRole} access.
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
            <div className="space-y-4">
              {/* Usage indicator */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Team Usage:</span>
                <span className={`font-medium ${isAtLimit ? 'text-destructive' : 'text-green-600'}`}>
                  {currentUsage} of {max_team_members} slots used
                </span>
              </div>
              
              {/* Limit warning */}
              {isAtLimit && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800">Team Limit Reached</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      You've reached your team member limit. To invite more members, please upgrade your subscription or remove existing members.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Invite form */}
              <form onSubmit={handleInviteMember} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    disabled={!canInviteMore}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isInviting || !canInviteMore}
                >
                  {isInviting ? 'Inviting...' : 'Send Invite'}
                </Button>
              </form>
            </div>
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
                    <p className="text-sm text-muted-foreground">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Pending</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke the invitation for {invitation.email}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No team members found. Try refreshing the page.</p>
            </div>
          ) : (
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
                      <p className="text-sm text-muted-foreground">
                        {member.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    {userRole === 'admin' && member.role !== 'admin' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
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
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Remove Team Member
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
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
                  
                  <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                    <p className="font-semibold text-red-700 mb-2">What will happen:</p>
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
                  
                  <p className="text-sm text-muted-foreground">
                    All their rundowns and blueprints will be safely transferred to you before their account is deleted.
                  </p>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isRemoving}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemoveMember}
              disabled={isLoadingPreview || isRemoving || !transferPreview}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
