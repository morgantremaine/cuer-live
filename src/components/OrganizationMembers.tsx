import React, { useEffect } from 'react';
import { User, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { OrganizationMember } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';

interface OrganizationMembersProps {
  organizationMembers: OrganizationMember[];
  currentTeamMembers: { user_id: string }[];
  organizationOwnerId: string | null;
  onAddMember: (userId: string) => Promise<{ success?: boolean; error?: string }>;
  onLoadMembers: (ownerId: string) => void;
}

const OrganizationMembers: React.FC<OrganizationMembersProps> = ({
  organizationMembers,
  currentTeamMembers,
  organizationOwnerId,
  onAddMember,
  onLoadMembers,
}) => {
  const { toast } = useToast();
  const [addingMemberId, setAddingMemberId] = React.useState<string | null>(null);

  useEffect(() => {
    if (organizationOwnerId) {
      onLoadMembers(organizationOwnerId);
    }
  }, [organizationOwnerId, onLoadMembers]);

  const handleAddMember = async (userId: string, userName: string) => {
    setAddingMemberId(userId);
    try {
      const result = await onAddMember(userId);
      if (result.success) {
        toast({
          title: 'Member added',
          description: `${userName} has been added to this team`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add member',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setAddingMemberId(null);
    }
  };

  const isInCurrentTeam = (userId: string) => {
    return currentTeamMembers.some(member => member.user_id === userId);
  };

  if (!organizationOwnerId || organizationMembers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Organization Members</h3>
        <Badge variant="secondary" className="ml-auto">
          {organizationMembers.length} {organizationMembers.length === 1 ? 'person' : 'people'}
        </Badge>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        Add people from across your organization to this team
      </div>

      <div className="space-y-3">
        {organizationMembers.map((member) => {
          const inTeam = isInCurrentTeam(member.user_id);
          
          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {member.full_name || member.email}
                    </p>
                    {inTeam && (
                      <Badge variant="secondary" className="shrink-0">
                        Current team
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>
                      In {member.team_count} {member.team_count === 1 ? 'team' : 'teams'}
                      {member.teams_list.length > 0 && (
                        <span className="ml-1">
                          ({member.teams_list.slice(0, 2).join(', ')}
                          {member.teams_list.length > 2 && `, +${member.teams_list.length - 2} more`})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant={inTeam ? 'ghost' : 'default'}
                size="sm"
                disabled={inTeam || addingMemberId === member.user_id}
                onClick={() => handleAddMember(member.user_id, member.full_name || member.email)}
                className="ml-4 shrink-0"
              >
                {addingMemberId === member.user_id ? 'Adding...' : inTeam ? 'In team' : 'Add to team'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrganizationMembers;
