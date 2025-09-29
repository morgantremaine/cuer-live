import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveTeam } from './useActiveTeam';
import { debugLogger } from '@/utils/debugLogger';

interface Team {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
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

interface UserTeam {
  id: string;
  name: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export const useTeam = () => {
  const { user } = useAuth();
  const { activeTeamId, setActiveTeam } = useActiveTeam();
  const [team, setTeam] = useState<Team | null>(null);
  const [allUserTeams, setAllUserTeams] = useState<UserTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const lastInvitationLoadRef = useRef<number>(0);
  const lastMemberLoadRef = useRef<number>(0);

  const loadAllUserTeams = useCallback(async () => {
    if (!user) {
      setAllUserTeams([]);
      return [];
    }

    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          joined_at,
          teams!inner (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (membershipError) {
        console.error('Error fetching all user teams:', membershipError);
        throw membershipError;
      }

      const userTeams: UserTeam[] = membershipData?.map(membership => {
        const teamData = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
        return {
          id: teamData.id,
          name: teamData.name,
          role: membership.role as 'admin' | 'member',
          joined_at: membership.joined_at
        };
      }) || [];

      setAllUserTeams(userTeams);
      return userTeams;
    } catch (error) {
      console.error('Error loading all user teams:', error);
      return [];
    }
  }, [user]);

  const loadTeamData = async () => {
    debugLogger.team('loadTeamData called', { userId: user?.id, isLoading: isLoadingRef.current, activeTeamId });
    
    if (!user?.id || isLoadingRef.current) {
      debugLogger.team('Early exit - no user or already loading', { userId: !!user?.id, isLoading: isLoadingRef.current });
      setIsLoading(false);
      return;
    }

    debugLogger.team('Starting team data load for user:', user.id);
    isLoadingRef.current = true;

    try {
      // Add a small delay to ensure auth state is fully established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Load all user teams first
      const userTeams = await loadAllUserTeams();

      let targetTeamId = activeTeamId;

      // Check if user has pending invitation FIRST
      const pendingToken = localStorage.getItem('pendingInvitationToken');
      
      if (pendingToken && pendingToken !== 'undefined' && userTeams.length === 0) {
        debugLogger.team('No membership found but have pending token, skipping team creation');
        console.log('User has pending invitation token, waiting for invitation processing on JoinTeam page');
        
        // Don't create a personal team if there's a pending invitation
        setError(null);
        setTeam(null);
        setUserRole(null);
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // If no active team set or active team not in user's teams, determine which team to use
      if (!targetTeamId || !userTeams.find(t => t.id === targetTeamId)) {
        if (userTeams.length > 0) {
          // Use the most recent team
          targetTeamId = userTeams[0].id;
        } else {
          // User has no team memberships - create a personal team
          console.log('🔍 useTeam - No team found, creating personal team');
          
          debugLogger.team('Creating personal team as fallback');
          const { data: newTeamData, error: createError } = await supabase.rpc(
            'get_or_create_user_team',
            { user_uuid: user.id }
          );

          if (createError) {
            console.error('Error creating team:', createError);
            setError('Failed to set up team');
            setIsLoading(false);
            isLoadingRef.current = false;
            return;
          } else if (newTeamData) {
            console.log('Personal team created successfully, reloading...');
            // Retry loading team data
            setTimeout(() => {
              loadedUserRef.current = null;
              isLoadingRef.current = false;
              loadTeamData();
            }, 1000);
            return;
          }
          setError('Failed to load team data');
          setTeam(null);
          setUserRole(null);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Load the specific team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', targetTeamId)
        .single();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        throw teamError;
      }

      // Get user's role in this team
      const targetTeam = userTeams.find(t => t.id === targetTeamId);
      const role = targetTeam?.role || 'member';

      setTeam(teamData);
      setUserRole(role);
      
      // Set as active team if not already set
      if (activeTeamId !== targetTeamId) {
        setActiveTeam(targetTeamId);
      }

      console.log('🔍 useTeam - Set team:', teamData.id, teamData.name, 'Role:', role);
      
      setError(null);

      debugLogger.team('Loading team members for team:', teamData.id);
      // Load team members for ALL team members (not just admins)
      await loadTeamMembers(targetTeamId);
      
      // Load pending invitations only if user is admin
      if (role === 'admin') {
        debugLogger.team('Loading pending invitations for admin');
        await loadPendingInvitations(targetTeamId);
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
      setError('Failed to load team data');
      setTeam(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const switchToTeam = useCallback(async (teamId: string) => {
    console.log('🔍 useTeam - Switching to team:', teamId);
    setActiveTeam(teamId);
    // Reset loading state to trigger reload
    loadedUserRef.current = null;
    isLoadingRef.current = false;
    setIsLoading(true);
    // Delay to ensure activeTeamId is updated
    setTimeout(() => loadTeamData(), 100);
  }, [setActiveTeam]);

  const loadTeamMembers = async (teamId: string) => {
    // Add debouncing to prevent excessive API calls when switching accounts
    const now = Date.now();
    const lastMemberLoad = lastMemberLoadRef.current;
    if (lastMemberLoad && (now - lastMemberLoad) < 2000) {
      console.log('⏭️ Skipping member load - too frequent');
      return;
    }
    lastMemberLoadRef.current = now;
    
    try {
      // First get team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('id, user_id, role, joined_at')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (membersError) {
        console.error('Error loading team members:', membersError);
        return;
      }

      // Then get profiles for each user
      const userIds = membersData?.map(member => member.user_id) || [];
      
      if (userIds.length === 0) {
        setTeamMembers([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        // Still set members without profile data
        const membersWithoutProfiles = membersData.map(member => ({
          ...member,
          profiles: undefined
        }));
        setTeamMembers(membersWithoutProfiles);
        return;
      }

      // Combine the data
      const transformedMembers: TeamMember[] = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          profiles: profile ? {
            email: profile.email,
            full_name: profile.full_name
          } : undefined
        };
      });

      setTeamMembers(transformedMembers);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const loadPendingInvitations = async (teamId: string) => {
    // Add debouncing to prevent excessive API calls when switching accounts
    const now = Date.now();
    const lastInvitationLoad = lastInvitationLoadRef.current;
    if (lastInvitationLoad && (now - lastInvitationLoad) < 2000) {
      console.log('⏭️ Skipping invitation load - too frequent');
      return;
    }
    lastInvitationLoadRef.current = now;
    
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('id, email, created_at')
        .eq('team_id', teamId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading pending invitations:', error);
      } else {
        setPendingInvitations(data || []);
      }
    } catch (error) {
      console.error('Failed to load pending invitations:', error);
    }
  };

  const inviteTeamMember = async (email: string) => {
    if (!team?.id) {
      return { error: 'No team found' };
    }

    if (!user?.id) {
      return { error: 'User not authenticated' };
    }

    try {
      // Get user's profile to ensure we have the latest name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // Use profile data if available, otherwise fall back to auth metadata
      const inviterName = profileData?.full_name || 
                         user.user_metadata?.full_name || 
                         profileData?.email || 
                         user.email || 
                         'A team member';

      console.log('Calling send-team-invitation edge function with:', {
        email,
        teamId: team.id,
        inviterName,
        teamName: team.name
      });

      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: { 
          email, 
          teamId: team.id,
          inviterName,
          teamName: team.name
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        return { error: error.message };
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        return { error: data.error };
      }

      // Reload pending invitations
      await loadPendingInvitations(team.id);
      return { success: true };
    } catch (error) {
      console.error('Exception in inviteTeamMember:', error);
      return { error: 'Failed to send invitation' };
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        return { error: error.message };
      }

      // Reload pending invitations
      if (team?.id) {
        await loadPendingInvitations(team.id);
      }
      return { success: true };
    } catch (error) {
      return { error: 'Failed to revoke invitation' };
    }
  };

  const getTransferPreview = async (memberId: string) => {
    if (!team?.id) {
      return { error: 'No team found' };
    }

    try {
      const { data, error } = await supabase.rpc('get_member_transfer_preview', {
        member_id: memberId,
        team_id_param: team.id
      });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      return { error: 'Failed to get transfer preview' };
    }
  };

  const removeTeamMemberWithTransfer = async (memberId: string) => {
    if (!team?.id || !user?.id) {
      return { error: 'No team or user found' };
    }

    try {
      console.log('Calling delete-team-member edge function with:', {
        memberId,
        teamId: team.id
      });

      const { data, error } = await supabase.functions.invoke('delete-team-member', {
        body: { 
          memberId, 
          teamId: team.id
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        return { error: error.message };
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        return { error: data.error };
      }

      // Reload team members after successful deletion
      await loadTeamMembers(team.id);
      
      return { 
        result: {
          rundownsTransferred: data.rundownsTransferred || 0,
          blueprintsTransferred: data.blueprintsTransferred || 0
        }
      };
    } catch (error) {
      console.error('Exception in removeTeamMemberWithTransfer:', error);
      return { error: 'Failed to remove team member' };
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_invitation_secure', {
        invitation_token: token
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.success) {
        return { error: data.error };
      }

      // Clear the pending token immediately upon successful acceptance
      localStorage.removeItem('pendingInvitationToken');
      
      // Set the newly joined team as active if we have the team_id
      if (data.team_id) {
        console.log('Setting newly joined team as active:', data.team_id);
        setActiveTeam(data.team_id);
      }
      
      // Reload team data after successful invitation acceptance
      loadedUserRef.current = null;
      isLoadingRef.current = false;
      setTimeout(() => loadTeamData(), 500);
      return { success: true };
    } catch (error) {
      return { error: 'Failed to accept invitation' };
    }
  };

  // Load team data when user changes or active team changes
  useEffect(() => {
    // Only load if we don't have a cached result for this user or if active team changed
    if (user?.id && !isLoadingRef.current) {
      // Only log initial team loads to reduce noise
      if (!loadedUserRef.current) {
        debugLogger.team('Initial team load for user:', user.id);
      }
      setIsLoading(true);
      setTimeout(() => loadTeamData(), 100);
    } else if (!user?.id) {
      setTeam(null);
      setAllUserTeams([]);
      setTeamMembers([]);
      setPendingInvitations([]);
      setUserRole(null);
      setIsLoading(false);
      setError(null);
      loadedUserRef.current = null;
      isLoadingRef.current = false;
    }
  }, [user?.id, activeTeamId]);

  // Handle page visibility changes to prevent unnecessary reloads
  useEffect(() => {
    let lastVisibilityCheck = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Throttle visibility checks to max once per 5 seconds
        if (now - lastVisibilityCheck < 5000) return;
        lastVisibilityCheck = now;
        
        // Only reload if we don't have team data and we should have it
        if (user?.id && !team && !isLoadingRef.current) {
          debugLogger.team('Reloading team data after visibility change');
          setIsLoading(true);
          setTimeout(() => loadTeamData(), 100);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, team]);

  return {
    team,
    allUserTeams,
    teamMembers,
    pendingInvitations,
    userRole,
    isLoading,
    error,
    inviteTeamMember,
    revokeInvitation,
    getTransferPreview,
    removeTeamMemberWithTransfer,
    acceptInvitation,
    loadTeamData,
    loadTeamMembers,
    loadPendingInvitations,
    switchToTeam
  };
};