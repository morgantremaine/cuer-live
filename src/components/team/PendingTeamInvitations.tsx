import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, Clock, Check, X, Loader2 } from 'lucide-react';
import { usePendingInvitationsForMe, PendingInvitationForMe } from '@/hooks/usePendingInvitationsForMe';
import { formatDistanceToNow } from 'date-fns';

const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'admin': 'Admin',
    'manager': 'Manager',
    'showcaller': 'Showcaller',
    'member': 'Crew',
    'teleprompter': 'Teleprompter'
  };
  return roleMap[role] || role;
};

const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'admin': return 'default';
    case 'manager': return 'secondary';
    default: return 'outline';
  }
};

export const PendingTeamInvitations = () => {
  const {
    pendingInvitations,
    isLoading,
    isAccepting,
    isDeclining,
    acceptInvitation,
    declineInvitation
  } = usePendingInvitationsForMe();

  if (isLoading) {
    return null; // Don't show loading state to avoid layout shift
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-500/50 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-400" />
          <CardTitle className="text-lg">Pending Team Invitations</CardTitle>
        </div>
        <CardDescription>
          You've been invited to join {pendingInvitations.length === 1 ? 'a team' : `${pendingInvitations.length} teams`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingInvitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            isAccepting={isAccepting === invitation.id}
            isDeclining={isDeclining === invitation.id}
            onAccept={() => acceptInvitation(invitation)}
            onDecline={() => declineInvitation(invitation)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

interface InvitationCardProps {
  invitation: PendingInvitationForMe;
  isAccepting: boolean;
  isDeclining: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const InvitationCard = ({ 
  invitation, 
  isAccepting, 
  isDeclining, 
  onAccept, 
  onDecline 
}: InvitationCardProps) => {
  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true });
  const isProcessing = isAccepting || isDeclining;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-white truncate">{invitation.team_name}</span>
          <Badge variant={getRoleBadgeVariant(invitation.role)}>
            {getRoleDisplayName(invitation.role)}
          </Badge>
        </div>
        <div className="mt-1 text-sm text-gray-400">
          Invited by {invitation.invited_by_name || invitation.invited_by_email}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>Expires {expiresIn}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onDecline}
          disabled={isProcessing}
          className="flex-1 sm:flex-none border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          {isDeclining ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <X className="h-4 w-4 mr-1" />
              Decline
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
        >
          {isAccepting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PendingTeamInvitations;
