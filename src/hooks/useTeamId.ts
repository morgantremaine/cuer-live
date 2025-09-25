
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTeamId = () => {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTeamId = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

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
  }, [user]);

  return { teamId, loading };
};
