
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
      // Team functionality is currently disabled due to RLS issues
      // Return empty state until team functionality is re-enabled
      setTeam(null);
      setTeamMembers([]);
      setPendingInvitations([]);
      setUserRole(null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading team data:', error);
      setLoading(false);
    }
  }, [user]);

  const createTeam = useCallback(async (teamName: string) => {
    if (!user) return { error: 'User not authenticated' };

    // Team functionality is currently disabled
    return { error: 'Team functionality is temporarily disabled' };
  }, [user]);

  const inviteTeamMember = useCallback(async (email: string) => {
    if (!user || !team || userRole !== 'admin') {
      return { error: 'Not authorized to invite members' };
    }

    // Team functionality is currently disabled
    return { error: 'Team functionality is temporarily disabled' };
  }, [user, team, userRole]);

  const removeTeamMember = useCallback(async (memberId: string) => {
    if (!user || userRole !== 'admin') {
      return { error: 'Not authorized to remove members' };
    }

    // Team functionality is currently disabled
    return { error: 'Team functionality is temporarily disabled' };
  }, [user, userRole]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (!user) return { error: 'User not authenticated' };

    // Team functionality is currently disabled
    return { error: 'Team functionality is temporarily disabled' };
  }, [user]);

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
