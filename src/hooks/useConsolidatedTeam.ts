import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  created_at: string;
}

// Consolidated team hook that prevents multiple instances
let globalTeamState: {
  team: Team | null;
  teamMembers: TeamMember[];
  pendingInvitations: PendingInvitation[];
  userRole: 'admin' | 'member' | null;
  isLoading: boolean;
  error: string | null;
  loadedUserId: string | null;
} = {
  team: null,
  teamMembers: [],
  pendingInvitations: [],
  userRole: null,
  isLoading: true,
  error: null,
  loadedUserId: null
};

const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

export const useConsolidatedTeam = () => {
  const { user } = useAuth();
  const [, forceUpdate] = useState({});
  const isLoadingRef = useRef(false);

  // Subscribe to global state changes
  useEffect(() => {
    const callback = () => forceUpdate({});
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  const loadTeamData = async () => {
    if (!user?.id || isLoadingRef.current) return;
    
    // If already loaded for this user, don't reload
    if (globalTeamState.loadedUserId === user.id && globalTeamState.team) {
      console.log('🔄 useConsolidatedTeam: Already loaded for user:', user.id);
      return;
    }

    isLoadingRef.current = true;
    globalTeamState.isLoading = true;
    globalTeamState.error = null;
    notifySubscribers();

    try {
      console.log('🔄 useConsolidatedTeam: Loading team data for user:', user.id);
      
      const { data: membershipData, error: membershipError } = await supabase
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

      if (membershipError) {
        console.error('Error loading team membership:', membershipError);
        globalTeamState.error = 'Failed to load team data';
        globalTeamState.team = null;
        globalTeamState.userRole = null;
      } else if (membershipData?.teams) {
        const teamData = Array.isArray(membershipData.teams) ? membershipData.teams[0] : membershipData.teams;
        globalTeamState.team = {
          id: teamData.id,
          name: teamData.name
        };
        globalTeamState.userRole = membershipData.role;
        globalTeamState.error = null;
        globalTeamState.loadedUserId = user.id;
        
        console.log('✅ Team data loaded:', globalTeamState.team);
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
      globalTeamState.error = 'Failed to load team data';
    } finally {
      globalTeamState.isLoading = false;
      isLoadingRef.current = false;
      notifySubscribers();
    }
  };

  // Load team data when user changes
  useEffect(() => {
    if (user?.id) {
      loadTeamData();
    } else {
      // Clear data when no user
      globalTeamState.team = null;
      globalTeamState.teamMembers = [];
      globalTeamState.pendingInvitations = [];
      globalTeamState.userRole = null;
      globalTeamState.isLoading = false;
      globalTeamState.error = null;
      globalTeamState.loadedUserId = null;
      notifySubscribers();
    }
  }, [user?.id]);

  return {
    team: globalTeamState.team,
    teamMembers: globalTeamState.teamMembers,
    pendingInvitations: globalTeamState.pendingInvitations,
    userRole: globalTeamState.userRole,
    isLoading: globalTeamState.isLoading,
    loading: globalTeamState.isLoading, // Alias
    error: globalTeamState.error,
    loadTeamData,
    // Placeholder functions - not implemented in consolidated version
    inviteTeamMember: async () => ({ error: 'Not implemented in consolidated team hook' }),
    removeTeamMemberWithTransfer: async () => ({ error: 'Not implemented in consolidated team hook' }),
    getTransferPreview: async () => ({ error: 'Not implemented in consolidated team hook' }),
    revokeInvitation: async () => ({ error: 'Not implemented in consolidated team hook' }),
    acceptInvitation: async () => ({ error: 'Not implemented in consolidated team hook' })
  };
};