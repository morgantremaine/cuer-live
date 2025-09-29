import { createContext, useContext, ReactNode } from 'react';
import { useTeam as useTeamHook } from '@/hooks/useTeam';

type TeamContextType = ReturnType<typeof useTeamHook>;

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const teamData = useTeamHook();
  
  console.log('🏢 TeamProvider render:', { 
    teamId: teamData.team?.id, 
    teamName: teamData.team?.name,
    teamUpdatedAt: teamData.team?.updated_at,
    timestamp: new Date().toISOString()
  });

  return (
    <TeamContext.Provider value={teamData}>
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
