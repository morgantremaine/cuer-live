import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveTeam } from './useActiveTeam';
import { useToast } from '@/hooks/use-toast';
import { debugLogger } from '@/utils/debugLogger';

// Global state for team loading coordination across all hook instances
const globalLoadingStates = new Map<string, boolean>();
const globalLoadedKeys = new Map<string, boolean>();
const globalLoadPromises = new Map<string, Promise<void>>();
const globalRealtimeChannels = new Map<string, any>();
// Global cache for team data and roles to share across hook instances
const globalTeamCache = new Map<string, Team>();
const globalRoleCache = new Map<string, 'admin' | 'member' | 'manager'>();

export interface Team {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'manager';
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
  role: 'admin' | 'member' | 'manager';
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
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'manager' | null>(null);
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
          role: membership.role as 'admin' | 'member' | 'manager',
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

  const loadTeamData = useCallback(async () => {
    const currentActiveTeamId = activeTeamId;
    const loadKey = `${user?.id}-${currentActiveTeamId}`;
    
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // Check global loading state - deduplicate concurrent requests
    if (globalLoadingStates.get(loadKey)) {
      // Another instance is already loading this exact team
      const existingPromise = globalLoadPromises.get(loadKey);
      if (existingPromise) {
        try {
          // Wait for existing promise with timeout
          await Promise.race([
            existingPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Load timeout')), 10000))
          ]);
        } catch (error) {
          console.error('Existing promise timeout or error:', error);
          // Clear the hung state so we can retry
          globalLoadingStates.delete(loadKey);
          globalLoadPromises.delete(loadKey);
        }
      }
      return;
    }

    console.log('📊 useTeam - loadTeamData called', { userId: user?.id, currentActiveTeamId });
    const loadStartTime = Date.now();
    globalLoadingStates.set(loadKey, true);
    isLoadingRef.current = true;

    // Create a promise for this load operation with timeout
    const loadPromise = (async () => {
      try {
        // Wrap entire load operation with 10 second timeout
        await Promise.race([
          (async () => {
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
        globalLoadingStates.delete(loadKey);
        return;
      }

        // Use activeTeamId if it's valid for this user, otherwise use first available team
        if (currentActiveTeamId && userTeams.find(t => t.id === currentActiveTeamId)) {
          targetTeamId = currentActiveTeamId;
        } else if (userTeams.length > 0) {
          // Use the most recent team as fallback
          targetTeamId = userTeams[0].id;
          setActiveTeam(targetTeamId);
        } else {
          // User has no team memberships - create a personal team
          const { data: newTeamData, error: createError } = await supabase.rpc(
            'get_or_create_user_team',
            { user_uuid: user.id }
          );

          if (createError) {
            console.error('Error creating team:', createError);
            setError('Failed to set up team');
            setIsLoading(false);
            isLoadingRef.current = false;
            globalLoadingStates.delete(loadKey);
            return;
          } else if (newTeamData) {
            // Retry loading team data
            setTimeout(() => {
              globalLoadedKeys.delete(loadKey);
              globalLoadingStates.delete(loadKey);
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
          globalLoadingStates.delete(loadKey);
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

        console.log('✅ useTeam - Setting team state:', { teamId: teamData.id, teamName: teamData.name, role });
        setTeam(teamData);
        setUserRole(role);
        
        // Cache the team data and role for future hook instances
        globalTeamCache.set(loadKey, teamData);
        globalRoleCache.set(loadKey, role);
        
        // Only set as active team if it's different from current
        if (currentActiveTeamId !== targetTeamId) {
          setActiveTeam(targetTeamId);
        }
        
        setError(null);

            // Load additional data after setting main team state
            loadTeamMembers(targetTeamId);
            if (role === 'admin' || role === 'manager') {
              loadPendingInvitations(targetTeamId);
            }
            
            const loadTime = Date.now() - loadStartTime;
            if (loadTime > 5000) {
              console.warn(`⚠️ Team load took ${loadTime}ms - consider optimization`);
            }
          })(),
          // 10 second timeout
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Team load timeout after 10 seconds')), 10000)
          )
        ]);
      } catch (error) {
        console.error('Failed to load team data:', error);
        const errorMessage = error instanceof Error && error.message.includes('timeout') 
          ? 'Loading timed out. Please check your connection and try again.'
          : 'Failed to load team data';
        setError(errorMessage);
        setTeam(null);
        setUserRole(null);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
        globalLoadingStates.delete(loadKey);
        globalLoadedKeys.set(loadKey, true);
      }
    })();

    // Store the promise for request deduplication
    globalLoadPromises.set(loadKey, loadPromise);
    try {
      await loadPromise;
    } finally {
      globalLoadPromises.delete(loadKey);
    }
  }, [user, activeTeamId, setActiveTeam, loadAllUserTeams]);

  const switchToTeam = useCallback(async (teamId: string) => {
    if (teamId === activeTeamId && teamId === team?.id) {
      return;
    }
    
    // Clear global state and cache to force reload
    const oldLoadKey = `${user?.id}-${activeTeamId}`;
    const newLoadKey = `${user?.id}-${teamId}`;
    globalLoadedKeys.delete(oldLoadKey);
    globalLoadedKeys.delete(newLoadKey);
    globalLoadingStates.delete(oldLoadKey);
    globalLoadingStates.delete(newLoadKey);
    globalTeamCache.delete(oldLoadKey);
    globalTeamCache.delete(newLoadKey);
    globalRoleCache.delete(oldLoadKey);
    globalRoleCache.delete(newLoadKey);
    
    // Update the active team state and force reload
    setActiveTeam(teamId);
    setIsLoading(true);
    isLoadingRef.current = false;
    loadedUserRef.current = null;
    
    loadTeamData();
  }, [team?.id, activeTeamId, setActiveTeam, loadTeamData, user?.id]);

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
          blueprintsTransferred: data.blueprintsTransferred || 0,
          layoutsTransferred: data.layoutsTransferred || 0,
          customColumnsTransferred: data.customColumnsTransferred || 0
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
      
      // Realtime subscription will propagate this change to all other hook instances
      return { success: true };
    } catch (error) {
      return { error: 'Failed to update team name' };
    }
  };

  const leaveCurrentTeam = async () => {
    if (!team?.id || !user?.id) {
      return { error: 'No team or user found' };
    }

    if (userRole === 'admin') {
      return { error: 'Admins cannot leave the team. Please transfer admin role first.' };
    }

    try {
      console.log('Leaving team:', { teamId: team.id, userId: user.id });

      const { data, error } = await supabase.rpc('leave_team_as_member', {
        team_id_to_leave: team.id,
        user_id_leaving: user.id
      });

      if (error) {
        console.error('Error leaving team:', error);
        return { error: error.message };
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        return { error: data.error };
      }

      console.log('Successfully left team:', data);

      // Load all user teams to find the personal team
      const userTeams = await loadAllUserTeams();
      const personalTeam = userTeams.find(t => t.id !== team.id);
      
      if (personalTeam) {
        // Switch to personal team
        await switchToTeam(personalTeam.id);
      } else {
        // Fallback: reload team data to get personal team
        setActiveTeam(null);
        loadedUserRef.current = null;
        await loadTeamData();
      }

      return { 
        success: true,
        rundownsTransferred: data.rundowns_transferred || 0,
        blueprintsTransferred: data.blueprints_transferred || 0
      };
    } catch (error) {
      console.error('Exception in leaveCurrentTeam:', error);
      return { error: 'Failed to leave team' };
    }
  };

  const acceptInvitation = async (token: string) => {
    setIsProcessingInvitation(true);
    localStorage.setItem('isProcessingInvitation', 'true');
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
      localStorage.removeItem('isProcessingInvitation');
      setIsProcessingInvitation(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'member' | 'manager') => {
    if (!team?.id) {
      return { error: 'No team found' };
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('team_id', team.id);

      if (error) {
        return { error: error.message };
      }

      // Reload team members after successful role change
      await loadTeamMembers(team.id);
      return { success: true };
    } catch (error) {
      return { error: 'Failed to update member role' };
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
    
    // If data is already loaded, restore from cache and load related data
    if (globalLoadedKeys.get(currentKey)) {
      const cachedTeam = globalTeamCache.get(currentKey);
      const cachedRole = globalRoleCache.get(currentKey);
      
      if (cachedTeam && cachedRole) {
        setTeam(cachedTeam);
        setUserRole(cachedRole);
        setError(null);
        
        // Load all user teams for the dropdown
        loadAllUserTeams();
        
        // Load team members and invitations for this cached team
        loadTeamMembers(cachedTeam.id);
        if (cachedRole === 'admin' || cachedRole === 'manager') {
          loadPendingInvitations(cachedTeam.id);
        }
      }
      setIsLoading(false);
      return;
    }
    
    // Check global state - only load if not already loaded/loading
    if (!globalLoadingStates.get(currentKey)) {
      // Set the ref IMMEDIATELY to prevent race conditions
      loadedUserRef.current = currentKey;
      setIsLoading(true);
      
      // If loading fails, clear global state so it can be retried
      loadTeamData().catch(() => {
        loadedUserRef.current = null;
        globalLoadedKeys.delete(currentKey);
        globalLoadingStates.delete(currentKey);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTeamId]);

  // Realtime subscriptions for team membership changes
  useEffect(() => {
    if (!user?.id || !team?.id || isProcessingInvitation) return;
    
    // Use global channel tracking to prevent duplicates
    const channelKey = `team-members-${user.id}-${team.id}`;
    if (globalRealtimeChannels.has(channelKey)) {
      return; // Channel already exists
    }
    
    // Subscribe to team membership changes
    const memberChannel = supabase
      .channel(channelKey)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'team_members',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        const deletedMembership = payload.old;
        
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
            switchToTeam(nextTeam.id);
          } else {
            setActiveTeam(null);
            navigate('/dashboard');
          }
        }
      })
      .subscribe();
    
    globalRealtimeChannels.set(channelKey, memberChannel);
    
    return () => {
      supabase.removeChannel(memberChannel);
      globalRealtimeChannels.delete(channelKey);
    };
  }, [user?.id, team?.id, isProcessingInvitation, toast, navigate, setActiveTeam, loadAllUserTeams, switchToTeam]);

  // Subscribe to team updates for real-time name changes
  useEffect(() => {
    if (!user?.id || !activeTeamId) return;

    const channelKey = `team-updates-${user.id}-${activeTeamId}`;
    
    // Use global channel tracking to prevent duplicates
    if (globalRealtimeChannels.has(channelKey)) {
      return;
    }
    
    console.log('[useTeam] Setting up team updates subscription for team:', activeTeamId);
    
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `id=eq.${activeTeamId}`
        },
        (payload) => {
          console.log('🔄 Team updated via realtime:', payload);
          const updatedTeam = payload.new as Team;
          
          // Update local team state
          setTeam(prev => prev ? { ...prev, name: updatedTeam.name } : null);
          
          // Update in allUserTeams
          setAllUserTeams(prev => 
            prev.map(t => t.id === updatedTeam.id ? { ...t, name: updatedTeam.name } : t)
          );
          
          // Update global cache
          const loadKey = `${user.id}-${updatedTeam.id}`;
          const cachedTeam = globalTeamCache.get(loadKey);
          if (cachedTeam) {
            globalTeamCache.set(loadKey, { ...cachedTeam, name: updatedTeam.name });
            console.log('[useTeam] Updated global cache for team:', updatedTeam.id);
          }
        }
      )
      .subscribe();
    
    globalRealtimeChannels.set(channelKey, channel);

    return () => {
      console.log('[useTeam] Cleaning up team updates subscription');
      supabase.removeChannel(channel);
      globalRealtimeChannels.delete(channelKey);
    };
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
    updateTeamName,
    updateMemberRole,
    leaveCurrentTeam,
    loadTeamData,
    loadTeamMembers,
    loadPendingInvitations,
    switchToTeam
  };
};