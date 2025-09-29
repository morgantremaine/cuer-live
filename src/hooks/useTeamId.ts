
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
      // Fallback: fetch team ID from database if no active team is set
      console.log('🔍 useTeamId - No activeTeamId, fetching from database for user:', user.id);
      const fetchTeamId = async () => {
        try {
          const { data, error } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .order('joined_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log('🔍 useTeamId - Database fetch result:', { userId: user.id, teamId: data?.team_id, error });

          if (error) {
            console.error('Error fetching team ID:', error);
          } else if (data) {
            console.log('🔍 useTeamId - Setting teamId from database:', data.team_id);
            setTeamId(data.team_id);
          } else {
            // No team membership found - let useTeam handle team creation
            console.log('No team membership found for user');
          }
        } catch (error) {
          console.error('Error fetching team ID:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchTeamId();
    }
  }, [user, activeTeamId]);

  return { teamId, loading };
};
