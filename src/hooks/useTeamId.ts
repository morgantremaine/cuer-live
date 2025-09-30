
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveTeam } from './useActiveTeam';

export const useTeamId = () => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { activeTeamId } = useActiveTeam();

  useEffect(() => {
    console.log('🔍 useTeamId - useEffect triggered:', { activeTeamId, user: user?.id, loading });
    
    if (activeTeamId) {
      console.log('🔍 useTeamId - Using activeTeamId from localStorage:', activeTeamId);
      setTeamId(activeTeamId);
      setLoading(false);
    } else if (!user) {
      console.log('🔍 useTeamId - No user, clearing teamId');
      setTeamId(null);
      setLoading(false);
    } else {
      // Only fetch from database if we truly have no active team preference
      // and this is the initial load (not a temporary null state)
      console.log('🔍 useTeamId - No activeTeamId, checking if should fetch from database');
      
      // Don't override user's team selection with database fallback
      // Only use database fallback on true initial load
      setTeamId(null);
      setLoading(false);
    }
  }, [user, activeTeamId]);

  return { teamId, loading };
};
