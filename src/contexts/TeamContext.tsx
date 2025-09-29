import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useTeam as useTeamHook } from '@/hooks/useTeam';

type TeamContextType = ReturnType<typeof useTeamHook>;

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const teamData = useTeamHook();
  
  // Memoize the context value to ensure it updates properly
  const contextValue = useMemo(() => teamData, [
    teamData.team,
    teamData.allUserTeams,
    teamData.teamMembers,
    teamData.pendingInvitations,
    teamData.userRole,
    teamData.isLoading,
    teamData.error,
    teamData.inviteTeamMember,
    teamData.revokeInvitation,
    teamData.getTransferPreview,
    teamData.removeTeamMemberWithTransfer,
    teamData.acceptInvitation,
    teamData.updateTeamName,
    teamData.loadTeamData,
    teamData.loadTeamMembers,
    teamData.loadPendingInvitations,
    teamData.switchToTeam
  ]);
  
  console.log('🏢 TeamProvider render:', { 
    teamId: contextValue.team?.id, 
    teamName: contextValue.team?.name,
    teamUpdatedAt: contextValue.team?.updated_at,
    timestamp: new Date().toISOString()
  });

  return (
    <TeamContext.Provider value={contextValue}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
