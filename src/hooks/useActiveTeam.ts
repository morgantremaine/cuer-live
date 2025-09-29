import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ActiveTeamState {
  activeTeamId: string | null;
  loading: boolean;
}

const ACTIVE_TEAM_KEY = 'cuer-active-team';

export const useActiveTeam = () => {
  const { user } = useAuth();
  const [state, setState] = useState<ActiveTeamState>({
    activeTeamId: null,
    loading: true
  });

  // Load active team from localStorage on mount
  useEffect(() => {
    if (!user) {
      setState({ activeTeamId: null, loading: false });
      return;
    }

    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    const storedTeamId = localStorage.getItem(userKey);
    
    setState({
      activeTeamId: storedTeamId,
      loading: false
    });
  }, [user]);

  const setActiveTeam = useCallback((teamId: string | null) => {
    if (!user) return;

    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    
    if (teamId) {
      localStorage.setItem(userKey, teamId);
    } else {
      localStorage.removeItem(userKey);
    }
    
    setState(prev => ({ ...prev, activeTeamId: teamId }));
  }, [user]);

  const clearActiveTeam = useCallback(() => {
    if (!user) return;
    
    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    localStorage.removeItem(userKey);
    setState(prev => ({ ...prev, activeTeamId: null }));
  }, [user]);

  return {
    activeTeamId: state.activeTeamId,
    loading: state.loading,
    setActiveTeam,
    clearActiveTeam
  };
};