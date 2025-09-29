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
    console.log('🔍 useActiveTeam - useEffect triggered:', { user: user?.id, hasUser: !!user });
    
    if (!user) {
      console.log('❌ useActiveTeam - No user, setting activeTeamId to null');
      setState({ activeTeamId: null, loading: false });
      return;
    }

    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    const storedTeamId = localStorage.getItem(userKey);
    
    console.log('🔍 useActiveTeam - Loading from localStorage:', { userKey, storedTeamId });
    
    setState({
      activeTeamId: storedTeamId,
      loading: false
    });
  }, [user]);

  const setActiveTeam = useCallback((teamId: string | null) => {
    console.log('🔄 useActiveTeam - setActiveTeam called:', { teamId, user: user?.id });
    
    if (!user) {
      console.log('❌ useActiveTeam - No user, cannot set active team');
      return;
    }

    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    
    if (teamId) {
      console.log('💾 useActiveTeam - Storing teamId in localStorage:', { userKey, teamId });
      localStorage.setItem(userKey, teamId);
    } else {
      console.log('🗑️ useActiveTeam - Removing teamId from localStorage:', { userKey });
      localStorage.removeItem(userKey);
    }
    
    setState(prev => ({ ...prev, activeTeamId: teamId }));
    console.log('✅ useActiveTeam - State updated:', { activeTeamId: teamId });
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