import React, { createContext, useContext, ReactNode } from 'react';
import { useTeam, Team, TeamMember, PendingInvitation, UserTeam, OrganizationMember } from '@/hooks/useTeam';

// Use ReturnType to infer the exact type from useTeam hook
type TeamHookReturnType = ReturnType<typeof useTeam>;

// Re-export the type for consumers
export type TeamContextType = TeamHookReturnType;

const TeamContext = createContext<TeamContextType | null>(null);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const teamHook = useTeam();
  
  return (
    <TeamContext.Provider value={teamHook}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeamContext = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
};

// Export for components that need to check if context exists (optional usage)
export const useTeamContextOptional = (): TeamContextType | null => {
  return useContext(TeamContext);
};
