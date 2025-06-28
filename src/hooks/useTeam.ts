
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Team {
  id: string;
  name: string;
}

export const useTeam = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadTeamData = async () => {
      if (!user?.id || isLoadingRef.current) {
        setIsLoading(false);
        return;
      }

      // Prevent duplicate loading for the same user
      if (loadedUserRef.current === user.id) {
        setIsLoading(false);
        return;
      }

      isLoadingRef.current = true;
      loadedUserRef.current = user.id;

      try {
        const { data, error } = await supabase
          .from('team_members')
          .select(`
            team_id,
            role,
            teams (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error loading team data:', error);
          setError('Failed to load team data');
          setTeam(null);
        } else if (data?.teams) {
          setTeam({
            id: data.teams.id,
            name: data.teams.name
          });
          setError(null);
        } else {
          setTeam(null);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load team data:', error);
        setError('Failed to load team data');
        setTeam(null);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    // Reset loading flag when user changes
    if (user?.id && user.id !== loadedUserRef.current) {
      loadedUserRef.current = null;
      loadTeamData();
    } else if (!user?.id) {
      setTeam(null);
      setIsLoading(false);
      setError(null);
      loadedUserRef.current = null;
    }
  }, [user?.id]);

  return { team, isLoading, error };
};
