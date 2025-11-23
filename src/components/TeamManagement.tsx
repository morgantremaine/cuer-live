import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTeam } from '@/hooks/useTeam';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Crown, User, Users, Mail, X, AlertTriangle, Loader2, Pencil, Check, LogOut, Shield, UserX } from 'lucide-react';
import OrganizationMembers from '@/components/OrganizationMembers';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState('');
  const [isSavingTeamName, setIsSavingTeamName] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isMounting, setIsMounting] = useState(true);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ memberId: string; memberName: string; newRole: 'member' | 'manager' | 'showcaller' | 'teleprompter' } | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  
  const {
    team,
    teamMembers,
    pendingInvitations,
    organizationMembers,
    userRole,
    isLoading,
    error,
    inviteTeamMember,
    removeTeamMemberWithTransfer,
    getTransferPreview,
    revokeInvitation,
    updateTeamName,
    updateMemberRole,
    leaveCurrentTeam,
    loadOrganizationMembers,
    addOrgMemberToTeam,
    allUserTeams
  } = useTeam();
  
  const { max_team_members, subscription_tier, loading: subscriptionLoading } = useSubscription();
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
      if (result?.layoutsTransferred > 0) {
        transferredItems.push(`${result.layoutsTransferred} saved layout${result.layoutsTransferred > 1 ? 's' : ''}`);
      }
      if (result?.customColumnsTransferred > 0) {
        transferredItems.push(`${result.customColumnsTransferred} custom column${result.customColumnsTransferred > 1 ? 's' : ''}`);
      }
      
      const transferMessage = transferredItems.length > 0 
        ? ` ${transferredItems.join(', ')} transferred to you.`
        : '';
      
      const warningMessage = result?.warning ? ` Note: ${result.warning}` : '';
      
      toast({
        title: 'Team member removed',
        description: `${memberToRemove.name} has been removed from the team.${transferMessage}${warningMessage}`,
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

  const handleEditTeamName = () => {
    setEditedTeamName(team?.name || '');
    setIsEditingTeamName(true);
  };

  const handleSaveTeamName = async () => {
    if (!editedTeamName.trim()) {
      toast({
        title: 'Error',
        description: 'Team name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingTeamName(true);
    const { error } = await updateTeamName(editedTeamName);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Team name updated successfully!',
      });
      setIsEditingTeamName(false);
    }
    
    setIsSavingTeamName(false);
  };

  const handleCancelEditTeamName = () => {
    setIsEditingTeamName(false);
    setEditedTeamName('');
  };

  const handleLeaveTeam = async () => {
    setIsLeavingTeam(true);
    const { error, rundownsTransferred, blueprintsTransferred } = await leaveCurrentTeam();
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      setIsLeavingTeam(false);
    } else {
      const transferredItems = [];
      if (rundownsTransferred && rundownsTransferred > 0) {
        transferredItems.push(`${rundownsTransferred} rundown${rundownsTransferred > 1 ? 's' : ''}`);
      }
      if (blueprintsTransferred && blueprintsTransferred > 0) {
        transferredItems.push(`${blueprintsTransferred} blueprint${blueprintsTransferred > 1 ? 's' : ''}`);
      }
      
      const transferMessage = transferredItems.length > 0 
        ? ` ${transferredItems.join(' and ')} transferred to the team admin.`
        : '';
      
      toast({
        title: 'Left Team',
        description: `You have successfully left ${team?.name}.${transferMessage}`,
      });
      
      setIsLeavingTeam(false);
      setShowLeaveDialog(false);
    }
  };

  const handleRoleChangeClick = (memberId: string, memberName: string, newRole: 'member' | 'manager' | 'showcaller' | 'teleprompter') => {
    setRoleChangeDialog({ memberId, memberName, newRole });
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeDialog) return;
    
    setIsChangingRole(true);
    const { error } = await updateMemberRole(roleChangeDialog.memberId, roleChangeDialog.newRole);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      const action = roleChangeDialog.newRole === 'manager' 
        ? 'promoted to Manager' 
        : roleChangeDialog.newRole === 'teleprompter' 
        ? 'assigned Teleprompter role'
        : 'changed to Member';
      toast({
        title: 'Role Updated',
        description: `${roleChangeDialog.memberName} has been ${action}.`,
      });
    }
    
    setIsChangingRole(false);
    setRoleChangeDialog(null);
  };

  const handleCancelRoleChange = () => {
    setRoleChangeDialog(null);
  };

  // Clear mounting state after a brief delay to prevent flash
  useEffect(() => {
    if (team && !isLoading) {
      const timer = setTimeout(() => {
        setIsMounting(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [team, isLoading]);

  if (isLoading || !team || isMounting || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading team information...</p>
        </div>
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


  // Calculate current team usage (members + pending invitations)
  const currentUsage = teamMembers.length + pendingInvitations.length;
  const isAtLimit = currentUsage >= max_team_members;
  const canInviteMore = (userRole === 'admin' || userRole === 'manager') && !isAtLimit;

  // Check if this is the user's personal team or an invited team
  const isPersonalTeam = allUserTeams.length > 0 && 
    allUserTeams.find(t => t.id === team?.id && t.role === 'admin' && allUserTeams.length === 1);
  const canLeaveTeam = userRole === 'member' && !isPersonalTeam;

  return (
    <div className="space-y-6">
      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            {isEditingTeamName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editedTeamName}
                  onChange={(e) => setEditedTeamName(e.target.value)}
                  disabled={isSavingTeamName}
                  className="max-w-md"
                  placeholder="Enter team name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTeamName();
                    if (e.key === 'Escape') handleCancelEditTeamName();
                  }}
                />
                <Button 
                  size="sm" 
                  onClick={handleSaveTeamName}
                  disabled={isSavingTeamName}
                >
                  {isSavingTeamName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleCancelEditTeamName}
                  disabled={isSavingTeamName}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <span>{team.name}</span>
                {userRole === 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditTeamName}
                    className="ml-auto"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </CardTitle>
          <CardDescription>
            Manage your team members and collaborate on rundowns. You have {userRole} access.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Invite Members Section - Only for Admins and Managers */}
      {(userRole === 'admin' || userRole === 'manager') && (
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

      {/* Pending Invitations - Only for Admins and Managers */}
      {(userRole === 'admin' || userRole === 'manager') && pendingInvitations.length > 0 && (
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
                        {member.role === 'manager' && (
                          <Shield className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {userRole === 'admin' && member.role !== 'admin' ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole: 'member' | 'manager' | 'showcaller' | 'teleprompter') => 
                            handleRoleChangeClick(
                              member.id, 
                              member.profiles?.full_name || member.profiles?.email || 'Unknown User',
                              newRole
                            )
                          }
                        >
                          <SelectTrigger className="w-[130px] bg-muted">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="showcaller">Showcaller</SelectItem>
                            <SelectItem value="teleprompter">Teleprompter</SelectItem>
                          </SelectContent>
                        </Select>
                    ) : (
                      <Badge variant={
                        member.role === 'admin' ? 'default' : 
                        member.role === 'manager' ? 'secondary' : 
                        member.role === 'showcaller' ? 'secondary' :
                        member.role === 'teleprompter' ? 'outline' : 
                        'outline'
                      }>
                        {member.role}
                      </Badge>
                    )}
                    {(userRole === 'admin' || userRole === 'manager') && member.role !== 'admin' && (
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

      {/* Organization Members - Enterprise Only */}
      {subscription_tier === 'Enterprise' && (userRole === 'admin' || userRole === 'manager') && team && (
        <Card>
          <CardContent className="pt-6">
            <OrganizationMembers
              organizationMembers={organizationMembers}
              currentTeamMembers={teamMembers}
              organizationOwnerId={team.organization_owner_id || null}
              onAddMember={addOrgMemberToTeam}
              onLoadMembers={loadOrganizationMembers}
            />
          </CardContent>
        </Card>
      )}

      {/* Leave Team Button (Members Only) */}
      {canLeaveTeam && (
        <div className="pt-6 border-t">
          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-orange-600 text-orange-700 hover:bg-orange-100">
                <LogOut className="h-4 w-4 mr-2" />
                Leave {team?.name}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Leave Team
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <div className="space-y-3">
                    <div>
                      Are you sure you want to leave <strong>{team?.name}</strong>?
                    </div>
                    <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
                      <div className="font-semibold text-orange-700 mb-2">You will:</div>
                      <ul className="space-y-1 text-sm">
                        <li>• Lose access to all team rundowns</li>
                        <li>• Keep your account and personal team</li>
                        <li>• Need a new invitation to rejoin</li>
                      </ul>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLeavingTeam}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleLeaveTeam}
                  disabled={isLeavingTeam}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isLeavingTeam ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Leaving...
                    </>
                  ) : (
                    'Leave Team'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Enhanced Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && handleCancelRemoveMember()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Remove Team Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2">Loading transfer preview...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the team?
                  </div>
                  
                  {transferPreview && (
                    <div className="bg-muted p-3 rounded space-y-2">
                      <div className="font-semibold">Transfer Summary:</div>
                      <ul className="space-y-1 text-sm">
                        <li>• {transferPreview.rundown_count} rundown(s) will be transferred to you</li>
                        <li>• {transferPreview.blueprint_count} blueprint(s) will be transferred to you</li>
                      </ul>
                    </div>
                  )}
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border-l-4 border-amber-500">
                    <div className="font-semibold text-amber-800 dark:text-amber-200 mb-2">What happens:</div>
                    <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                      <li>• Member will be removed from this team</li>
                      <li>• Their rundowns and blueprints will be transferred to you</li>
                      <li>• They will keep their account and personal team</li>
                      <li>• They can be re-invited in the future</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving || isLoadingPreview}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRemoveMember}
              disabled={isRemoving || isLoadingPreview}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeDialog} onOpenChange={(open) => !open && handleCancelRoleChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleChangeDialog?.newRole === 'manager' 
                ? 'Promote to Manager' 
                : roleChangeDialog?.newRole === 'showcaller'
                ? 'Change to Showcaller'
                : roleChangeDialog?.newRole === 'teleprompter'
                ? 'Change to Teleprompter'
                : 'Change to Member'}
            </AlertDialogTitle>
            <AlertDialogDescription>
            {roleChangeDialog?.newRole === 'manager' ? (
              <div>
                <strong>{roleChangeDialog.memberName}</strong> will be promoted to Manager and will now have the ability to manage team members (invite and remove).
              </div>
            ) : roleChangeDialog?.newRole === 'showcaller' ? (
              <div>
                <strong>{roleChangeDialog.memberName}</strong> will be changed to Showcaller and will have full rundown editing permissions plus the ability to control showcaller playback.
              </div>
            ) : roleChangeDialog?.newRole === 'teleprompter' ? (
              <div>
                <strong>{roleChangeDialog.memberName}</strong> will be changed to Teleprompter and will only be able to access the teleprompter feature. They will lose access to editing rundowns and managing team members.
              </div>
            ) : (
              <div>
                <strong>{roleChangeDialog?.memberName}</strong> will be changed to Member with standard access and will lose the ability to manage team members.
              </div>
            )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingRole}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRoleChange}
              disabled={isChangingRole}
            >
              {isChangingRole ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamManagement;
