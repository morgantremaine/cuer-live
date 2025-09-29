
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
    if (activeTeamId) {
      setTeamId(activeTeamId);
      setLoading(false);
    } else if (!user) {
      setTeamId(null);
      setLoading(false);
    } else {
      // Fallback: fetch team ID from database if no active team is set
      const fetchTeamId = async () => {
        try {
          const { data, error } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .order('joined_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          console.log('🔍 useTeamId - User:', user.id, 'Found teamId:', data?.team_id);

          if (error) {
            console.error('Error fetching team ID:', error);
          } else if (data) {
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
