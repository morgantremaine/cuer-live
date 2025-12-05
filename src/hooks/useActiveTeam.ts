import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ActiveTeamState {
  activeTeamId: string | null;
  loading: boolean;
}

const ACTIVE_TEAM_KEY = 'cuer-active-team';

export const useActiveTeam = () => {
  const { user } = useAuth();
  
  // Initialize synchronously with localStorage value
  const [state, setState] = useState<ActiveTeamState>(() => {
    if (!user?.id) {
      return { activeTeamId: null, loading: true };
    }
    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    const storedTeamId = localStorage.getItem(userKey);
    return {
      activeTeamId: storedTeamId,
      loading: false
    };
  });

  // Handle user changes and storage sync
  useEffect(() => {
    if (!user?.id) {
      setState({ activeTeamId: null, loading: false });
      return;
    }

    const userKey = `${ACTIVE_TEAM_KEY}-${user.id}`;
    const storedTeamId = localStorage.getItem(userKey);
    
    // Only update state if values actually changed to prevent unnecessary re-renders
    setState(prev => {
      if (prev.activeTeamId === storedTeamId && !prev.loading) {
        return prev; // Return same reference to prevent re-render
      }
      return { activeTeamId: storedTeamId, loading: false };
    });

    // Listen for storage changes to sync across tabs and instances
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === userKey) {
        console.log('🔄 useActiveTeam - Storage changed externally:', { newValue: e.newValue });
        setState(prev => ({ ...prev, activeTeamId: e.newValue }));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

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
    
    // Update state immediately and synchronously
    setState(prev => {
      const newState = { ...prev, activeTeamId: teamId };
      console.log('✅ useActiveTeam - State updated immediately:', { activeTeamId: teamId });
      return newState;
    });
    
    // Trigger a storage event to sync across all instances
    window.dispatchEvent(new StorageEvent('storage', {
      key: userKey,
      newValue: teamId,
      oldValue: localStorage.getItem(userKey)
    }));
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