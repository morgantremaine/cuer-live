
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  team_id: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
  token: string;
}

export const useTeam = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTeamData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading team data for user:', user.id);

      // For now, just set everything to empty/null since RLS is disabled on teams
      setTeam(null);
      setTeamMembers([]);
      setPendingInvitations([]);
      setUserRole(null);
      setLoading(false);
      
      console.log('Team functionality temporarily disabled due to RLS simplification');
    } catch (error) {
      console.error('Error loading team data:', error);
      setLoading(false);
    }
  }, [user]);

  const createTeam = useCallback(async (teamName: string) => {
    if (!user) return { error: 'User not authenticated' };

    toast({
      title: 'Notice',
      description: 'Team functionality is temporarily disabled while we fix database issues.',
      variant: 'default',
    });

    return { error: 'Team functionality temporarily disabled' };
  }, [user, toast]);

  const inviteTeamMember = useCallback(async (email: string) => {
    return { error: 'Team functionality temporarily disabled' };
  }, []);

  const removeTeamMember = useCallback(async (memberId: string) => {
    return { error: 'Team functionality temporarily disabled' };
  }, []);

  const acceptInvitation = useCallback(async (token: string) => {
    return { error: 'Team functionality temporarily disabled' };
  }, []);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  return {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    createTeam,
    inviteTeamMember,
    removeTeamMember,
    acceptInvitation,
    refreshTeamData: loadTeamData
  };
};
