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
const globalRoleCache = new Map<string, 'admin' | 'member' | 'manager' | 'showcaller' | 'teleprompter'>();
// Track last successful load time to prevent unnecessary refetches on tab switch
const globalLastLoadTime = new Map<string, number>();
const TEAM_DATA_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export interface Team {
  id: string;
  name: string;
  organization_owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member' | 'manager' | 'showcaller' | 'teleprompter';
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
  role?: string;
}

export interface UserTeam {
  id: string;
  name: string;
  role: 'admin' | 'member' | 'manager' | 'showcaller' | 'teleprompter';
  joined_at: string;
}

export interface OrganizationMember {
  user_id: string;
  email: string;
  full_name: string | null;
  team_count: number;
  teams_list: string[];
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
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'manager' | 'showcaller' | 'teleprompter' | null>(null);
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
        .select('id, name, organization_owner_id, created_at, updated_at')
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
          role: membership.role as 'admin' | 'member' | 'manager' | 'teleprompter',
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
        .select('id, email, created_at, role')
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

  const loadOrganizationMembers = useCallback(async (organizationOwnerId: string) => {
    if (!organizationOwnerId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_organization_members', {
        org_owner_uuid: organizationOwnerId
      });

      if (error) {
        console.error('Error loading organization members:', error);
        setOrganizationMembers([]);
      } else {
        setOrganizationMembers(data || []);
      }
    } catch (error) {
      console.error('Failed to load organization members:', error);
      setOrganizationMembers([]);
    }
  }, []);

  const addOrgMemberToTeam = useCallback(async (userId: string) => {
    if (!team?.id || !user?.id) {
      return { error: 'No team or user found' };
    }

    try {
      const { data, error } = await supabase.rpc('add_org_member_to_team', {
        target_user_id: userId,
        target_team_id: team.id,
        adding_user_id: user.id
      });

      if (error) {
        console.error('Error adding org member to team:', error);
        return { error: error.message };
      }

      if (!data.success) {
        return { error: data.error || 'Failed to add member' };
      }

      // Reload team members
      await loadTeamMembers(team.id);
      return { success: true };
    } catch (error) {
      console.error('Exception in addOrgMemberToTeam:', error);
      return { error: 'Failed to add organization member' };
    }
  }, [team?.id, user?.id, loadTeamMembers]);

  const loadTeamData = useCallback(async () => {
    const currentActiveTeamId = activeTeamId;
    const loadKey = `${user?.id}-${currentActiveTeamId}`;
    
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    // Check global loading state - deduplicate concurrent requests
    if (globalLoadingStates.get(loadKey)) {
      const existingPromise = globalLoadPromises.get(loadKey);
      if (existingPromise) {
        try {
          await Promise.race([
            existingPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Load timeout')), 10000))
          ]);
        } catch (error) {
          console.error('Existing promise timeout or error:', error);
          globalLoadingStates.delete(loadKey);
          globalLoadPromises.delete(loadKey);
        }
      }
      return;
    }

    const loadStartTime = Date.now();
    globalLoadingStates.set(loadKey, true);
    isLoadingRef.current = true;

    const loadPromise = (async () => {
      try {
        await Promise.race([
          (async () => {
            // Check for pending invitation first
            const pendingToken = localStorage.getItem('pendingInvitationToken');
            
            // If no active team yet, we need to determine one
            let targetTeamId = currentActiveTeamId;
            
            if (!targetTeamId) {
              // Quick check for user's teams to find one
              const { data: membershipData } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id)
                .limit(1)
                .single();
              
              if (membershipData?.team_id) {
                targetTeamId = membershipData.team_id;
                setActiveTeam(targetTeamId);
              } else if (pendingToken && pendingToken !== 'undefined') {
                // User has pending invitation, don't create team
                debugLogger.team('No membership found but have pending token, skipping team creation');
                setError(null);
                setTeam(null);
                setUserRole(null);
                setIsLoading(false);
                isLoadingRef.current = false;
                globalLoadingStates.delete(loadKey);
                return;
              } else {
                // Create personal team
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
                  targetTeamId = newTeamData;
                  setActiveTeam(targetTeamId);
                }
              }
            }

            if (!targetTeamId) {
              setError('Failed to load team data');
              setTeam(null);
              setUserRole(null);
              setIsLoading(false);
              isLoadingRef.current = false;
              globalLoadingStates.delete(loadKey);
              return;
            }

            // *** OPTIMIZED: Single RPC call gets everything ***
            const { data: contextData, error: contextError } = await supabase.rpc(
              'get_full_team_context',
              { user_uuid: user.id, team_uuid: targetTeamId }
            );

            if (contextError) {
              console.error('Error fetching team context:', contextError);
              throw contextError;
            }

            if (contextData?.error) {
              // User not a member of this team - find one they are a member of
              const { data: membershipData } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id)
                .limit(1)
                .single();
              
              if (membershipData?.team_id) {
                setActiveTeam(membershipData.team_id);
                globalLoadingStates.delete(loadKey);
                return;
              }
              throw new Error(contextData.error);
            }

            // Parse and set all state from single response
            const teamData = contextData.team;
            const role = contextData.userRole as 'admin' | 'member' | 'manager' | 'showcaller' | 'teleprompter';
            
            setTeam(teamData);
            setUserRole(role);
            
            // Set all user teams
            const userTeams: UserTeam[] = (contextData.allUserTeams || []).map((t: any) => ({
              id: t.team_id,
              name: t.team_name,
              role: t.role,
              joined_at: t.joined_at
            }));
            setAllUserTeams(userTeams);
            
            // Set team members with profiles
            const members: TeamMember[] = (contextData.teamMembers || []).map((m: any) => ({
              id: m.id,
              user_id: m.user_id,
              role: m.role,
              joined_at: m.joined_at,
              profiles: m.email ? {
                email: m.email,
                full_name: m.full_name,
                profile_picture_url: m.profile_picture_url
              } : undefined
            }));
            setTeamMembers(members);
            
            // Set pending invitations (only if admin/manager)
            if (role === 'admin' || role === 'manager') {
              const invitations: PendingInvitation[] = (contextData.pendingInvitations || []).map((i: any) => ({
                id: i.id,
                email: i.email,
                role: i.role,
                created_at: i.created_at
              }));
              setPendingInvitations(invitations);
            }
            
            // Set organization members if applicable
            if (contextData.organizationMembers?.length > 0) {
              setOrganizationMembers(contextData.organizationMembers);
            }
            
            // Cache the team data and role
            globalTeamCache.set(loadKey, teamData);
            globalRoleCache.set(loadKey, role);
            
            if (currentActiveTeamId !== targetTeamId) {
              setActiveTeam(targetTeamId);
            }
            
            setError(null);
            
            const loadTime = Date.now() - loadStartTime;
            if (loadTime > 2000) {
              console.warn(`⚠️ Team load took ${loadTime}ms`);
            } else {
              console.log(`✅ Team load completed in ${loadTime}ms`);
            }
          })(),
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
        globalLastLoadTime.set(loadKey, Date.now());
      }
    })();

    globalLoadPromises.set(loadKey, loadPromise);
    try {
      await loadPromise;
    } finally {
      globalLoadPromises.delete(loadKey);
    }
  }, [user, activeTeamId, setActiveTeam]);

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

  const inviteTeamMember = async (email: string, role: 'member' | 'manager' | 'showcaller' | 'teleprompter' = 'member') => {
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
        teamName: team.name,
        role
      });

      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: { 
          email, 
          teamId: team.id,
          inviterName,
          teamName: team.name,
          role
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
        customColumnsTransferred: data.customColumnsTransferred || 0,
        userDeleted: data.userDeleted || false,
        warning: data.warning
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
      
      // Return the team_id so caller can set it as active when user is ready
      // DON'T call setActiveTeam here - it may fail if user isn't set yet
      console.log('Invitation accepted, returning team_id:', data.team_id);
      
      // Reload team data after successful invitation acceptance
      loadedUserRef.current = null;
      isLoadingRef.current = false;
      setTimeout(() => loadTeamData(), 500);
      return { success: true, teamId: data.team_id };
    } catch (error) {
      localStorage.removeItem('pendingInvitationToken');
      return { error: 'Failed to accept invitation' };
    } finally {
      localStorage.removeItem('isProcessingInvitation');
      setIsProcessingInvitation(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'member' | 'manager' | 'showcaller' | 'teleprompter') => {
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
    
    // If data is already loaded, restore from cache
    if (globalLoadedKeys.get(currentKey)) {
      const cachedTeam = globalTeamCache.get(currentKey);
      const cachedRole = globalRoleCache.get(currentKey);
      
      if (cachedTeam && cachedRole) {
        setTeam(cachedTeam);
        setUserRole(cachedRole);
        setError(null);
        
        // Check if data is still fresh - skip refetches if within threshold
        const lastLoadTime = globalLastLoadTime.get(currentKey) || 0;
        const isDataFresh = Date.now() - lastLoadTime < TEAM_DATA_STALE_THRESHOLD;
        
        if (!isDataFresh) {
          // Data is stale, refresh related data
          loadAllUserTeams();
          loadTeamMembers(cachedTeam.id);
          if (cachedRole === 'admin' || cachedRole === 'manager') {
            loadPendingInvitations(cachedTeam.id);
          }
          globalLastLoadTime.set(currentKey, Date.now());
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

  // Subscribe to role changes for the current user
  useEffect(() => {
    if (!user?.id || !team?.id) return;

    const channelKey = `team-member-role-${user.id}-${team.id}`;
    
    // Use global channel tracking to prevent duplicates
    if (globalRealtimeChannels.has(channelKey)) {
      return;
    }
    
    const roleChannel = supabase
      .channel(channelKey)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'team_members',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        const oldMembership = payload.old as { team_id: string; role: string };
        const newMembership = payload.new as { team_id: string; role: string };
        
        // Check if role changed for the current team
        if (newMembership.team_id === team.id && oldMembership.role !== newMembership.role) {
          console.log('🔄 Role updated via realtime:', oldMembership.role, '->', newMembership.role);
          
          // Reload team data to get fresh role
          await loadTeamData();
          
          // Show notification about role change
          toast({
            title: 'Role Updated',
            description: `Your role has been changed to ${newMembership.role}`,
          });
        }
      })
      .subscribe();
    
    globalRealtimeChannels.set(channelKey, roleChannel);
    
    return () => {
      supabase.removeChannel(roleChannel);
      globalRealtimeChannels.delete(channelKey);
    };
  }, [user?.id, team?.id, toast, loadTeamData]);

  // Subscribe to team updates for real-time name changes
  useEffect(() => {
    if (!user?.id || !activeTeamId) return;

    const channelKey = `team-updates-${user.id}-${activeTeamId}`;
    
    // Use global channel tracking to prevent duplicates
    if (globalRealtimeChannels.has(channelKey)) {
      return;
    }
    
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

  const createNewTeam = useCallback(async (teamName: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a team',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data: newTeamId, error } = await supabase.rpc('create_new_team', {
        user_uuid: user.id,
        team_name: teamName
      });

      if (error) throw error;

      // Reload all teams
      await loadAllUserTeams();
      
      // Switch to the new team
      if (newTeamId) {
        setActiveTeam(newTeamId);
      }

      toast({
        title: 'Team created',
        description: `${teamName} has been created successfully`,
      });

      return newTeamId;
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast, loadAllUserTeams, setActiveTeam]);

  return {
    team,
    allUserTeams,
    teamMembers,
    pendingInvitations,
    organizationMembers,
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
    loadOrganizationMembers,
    addOrgMemberToTeam,
    switchToTeam,
    createNewTeam,
  };
};