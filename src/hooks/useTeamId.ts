
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
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching team ID:', error);
        } else if (data) {
          setTeamId(data.team_id);
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
