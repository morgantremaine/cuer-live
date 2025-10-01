import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveTeam } from './useActiveTeam';
import { useToast } from '@/hooks/use-toast';
import { debugLogger } from '@/utils/debugLogger';

export interface Team {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export interface PendingInvitation {
  id: string;
  email: string;
  created_at: string;
}

export interface UserTeam {
  id: string;
  name: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export const useTeam = () => {
  const { user } = useAuth();
  const { activeTeamId, setActiveTeam } = useActiveTeam();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [allUserTeams, setAllUserTeams] = useState<UserTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingInvitation, setIsProcessingInvitation] = useState(false);
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
      // Step 1: Get team memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role, joined_at')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (membershipError) {
        console.error('Error fetching team memberships:', membershipError);
        throw membershipError;
      }

      if (!membershipData || membershipData.length === 0) {
        setAllUserTeams([]);
        return [];
      }

      // Step 2: Get fresh team details directly from teams table
      const teamIds = membershipData.map(m => m.team_id);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, created_at, updated_at')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching team details:', teamsError);
        throw teamsError;
      }

      // Step 3: Combine the data
      const teamsMap = new Map(teamsData?.map(t => [t.id, t]) || []);
      const userTeams: UserTeam[] = membershipData.map(membership => {
        const teamData = teamsMap.get(membership.team_id);
        return {
          id: membership.team_id,
          name: teamData?.name || 'Unknown Team',
          role: membership.role as 'admin' | 'member',
          joined_at: membership.joined_at
        };
      });

      setAllUserTeams(userTeams);
      return userTeams;
    } catch (error) {
      console.error('Error loading all user teams:', error);
      return [];
    }
  }, [user]);

  const loadTeamData = useCallback(async () => {
    // Get the current activeTeamId directly to avoid stale closure issues
    const currentActiveTeamId = activeTeamId;
    
    // Reduced logging
    debugLogger.team('loadTeamData called', { userId: user?.id, isLoading: isLoadingRef.current, currentActiveTeamId });
    
    if (!user?.id || isLoadingRef.current) {
      debugLogger.team('Early exit - no user or already loading', { userId: !!user?.id, isLoading: isLoadingRef.current });
      setIsLoading(false);
      return;
    }

    debugLogger.team('Starting team data load for user:', user.id);
    isLoadingRef.current = true;

    try {
      // Load all user teams first
      const userTeams = await loadAllUserTeams();

      let targetTeamId = currentActiveTeamId;

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

      // Use activeTeamId if it's valid for this user, otherwise use first available team
      if (currentActiveTeamId && userTeams.find(t => t.id === currentActiveTeamId)) {
        targetTeamId = currentActiveTeamId;
      } else if (userTeams.length > 0) {
        // Use the most recent team as fallback
        targetTeamId = userTeams[0].id;
        console.log('🔄 useTeam - Using fallback team:', targetTeamId);
        setActiveTeam(targetTeamId);
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

      console.log('✅ useTeam - Setting team state:', { teamId: teamData.id, teamName: teamData.name, role, previousTeam: team?.id });
      setTeam(teamData);
      setUserRole(role);
      
      // Only set as active team if it's different from current
      if (currentActiveTeamId !== targetTeamId) {
        console.log('🔄 useTeam - Setting active team ID:', targetTeamId);
        setActiveTeam(targetTeamId);
      }

      console.log('🔍 useTeam - Team state updated:', teamData.id, teamData.name, 'Role:', role);
      
      setError(null);

      // Load additional data after setting main team state
      loadTeamMembers(targetTeamId);
      if (role === 'admin') {
        loadPendingInvitations(targetTeamId);
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
  }, [user, activeTeamId, setActiveTeam, loadAllUserTeams]);

  const switchToTeam = useCallback(async (teamId: string) => {
    console.log('🔄 useTeam - switchToTeam called:', { teamId, currentTeam: team?.id, currentActiveTeamId: activeTeamId });
    
    if (teamId === activeTeamId && teamId === team?.id) {
      console.log('⚠️ useTeam - Already on requested team, skipping switch');
      return;
    }
    
    console.log('🔄 useTeam - Setting active team to:', teamId);
    
    // Update the active team state and force reload
    setActiveTeam(teamId);
    setIsLoading(true);
    isLoadingRef.current = false;
    loadedUserRef.current = null; // Force reload
    
    // Immediate reload without delay
    loadTeamData();
    
    console.log('🔄 useTeam - Team switch initiated');
  }, [team?.id, activeTeamId, setActiveTeam, loadTeamData]);

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

  const updateTeamName = async (newName: string) => {
    if (!team?.id) {
      return { error: 'No team found' };
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      return { error: 'Team name cannot be empty' };
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: trimmedName, updated_at: new Date().toISOString() })
        .eq('id', team.id);

      if (error) {
        return { error: error.message };
      }

      // Immediately update local state for instant UI feedback
      setTeam(prev => prev ? { ...prev, name: trimmedName } : null);
      
      // Also update in the teams list
      setAllUserTeams(prev => prev.map(t => 
        t.id === team.id ? { ...t, name: trimmedName } : t
      ));
      
      return { success: true };
    } catch (error) {
      return { error: 'Failed to update team name' };
    }
  };

  const acceptInvitation = async (token: string) => {
    setIsProcessingInvitation(true);
    try {
      const { data, error } = await supabase.rpc('accept_invitation_secure', {
        invitation_token: token
      });

      if (error) {
        localStorage.removeItem('pendingInvitationToken');
        return { error: error.message };
      }

      if (!data.success) {
        localStorage.removeItem('pendingInvitationToken');
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
      localStorage.removeItem('pendingInvitationToken');
      return { error: 'Failed to accept invitation' };
    } finally {
      setIsProcessingInvitation(false);
    }
  };

  // Load team data when user or activeTeamId changes
  useEffect(() => {
    if (!user?.id) {
      setTeam(null);
      setAllUserTeams([]);
      setIsLoading(false);
      return;
    }
    
    const currentKey = `${user.id}-${activeTeamId}`;
    // Only load if we haven't already loaded for this user/team combination
    if (!isLoadingRef.current && loadedUserRef.current !== currentKey) {
      // Set the ref IMMEDIATELY to prevent race conditions
      loadedUserRef.current = currentKey;
      setIsLoading(true);
      
      // If loading fails, reset the ref so it can be retried
      loadTeamData().catch(() => {
        loadedUserRef.current = null;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTeamId]);

  // Realtime subscriptions for team membership changes
  useEffect(() => {
    if (!user?.id || !team?.id || isProcessingInvitation) return;
    
    console.log('🔔 Setting up realtime subscriptions for team:', team.id);
    
    // Subscribe to team membership changes
    const memberChannel = supabase
      .channel(`team-members-${user.id}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'team_members',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        const deletedMembership = payload.old;
        console.log('🔔 Team membership deleted:', deletedMembership);
        
        if (deletedMembership.team_id === team?.id) {
          toast({
            title: 'Removed from Team',
            description: 'You have been removed from this team.',
            variant: 'destructive'
          });
          
          // Clear this team and switch to another
          const teams = await loadAllUserTeams();
          const nextTeam = teams.find(t => t.id !== team.id);
          
          if (nextTeam) {
            console.log('🔄 Switching to next available team:', nextTeam.id);
            switchToTeam(nextTeam.id);
          } else {
            // No other teams, clear and redirect
            console.log('🔄 No other teams available, redirecting to dashboard');
            setActiveTeam(null);
            navigate('/dashboard');
          }
        }
      })
      .subscribe();
    
    return () => {
      console.log('🔔 Cleaning up realtime subscriptions on unmount');
      supabase.removeChannel(memberChannel);
    };
  }, [user?.id, team?.id, isProcessingInvitation, toast, navigate, setActiveTeam, loadAllUserTeams, switchToTeam]);

  // Persistent connection - no visibility-based reloads

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
    updateTeamName,
    loadTeamData,
    loadTeamMembers,
    loadPendingInvitations,
    switchToTeam
  };
};