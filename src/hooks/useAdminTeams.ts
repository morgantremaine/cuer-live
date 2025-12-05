import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useTeamContext } from '@/contexts/TeamContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminTeam {
  id: string;
  name: string;
}

export const useAdminTeams = () => {
  const { user } = useAuth();
  const { team: currentTeam } = useTeamContext();
  const [adminTeams, setAdminTeams] = useState<AdminTeam[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAdminTeams = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get teams where user is admin or manager
      const { data: memberships, error } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name)')
        .eq('user_id', user.id)
        .in('role', ['admin', 'manager']);

      if (error) throw error;

      // Extract teams and filter out current team
      const teams: AdminTeam[] = [];
      if (memberships) {
        for (const m of memberships) {
          const team = m.teams as unknown;
          if (team && typeof team === 'object' && 'id' in team && 'name' in team) {
            const t = team as { id: string; name: string };
            if (t.id !== currentTeam?.id) {
              teams.push(t);
            }
          }
        }
      }

      setAdminTeams(teams);
    } catch (error) {
      console.error('Error loading admin teams:', error);
      setAdminTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminTeams();
  }, [user?.id, currentTeam?.id]);

  return { adminTeams, loading, reloadAdminTeams: loadAdminTeams };
};
