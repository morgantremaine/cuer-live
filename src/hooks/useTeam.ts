
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { debugLogger } from '@/utils/debugLogger';

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

export const useTeam = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const lastInvitationLoadRef = useRef<number>(0);
  const lastMemberLoadRef = useRef<number>(0);

  const loadTeamData = async () => {
    debugLogger.team('loadTeamData called', { userId: user?.id, isLoading: isLoadingRef.current });
    
    if (!user?.id || isLoadingRef.current) {
      debugLogger.team('Early exit - no user or already loading', { userId: !!user?.id, isLoading: isLoadingRef.current });
      setIsLoading(false);
      return;
    }

    // Prevent duplicate loading for the same user
    if (loadedUserRef.current === user.id) {
      debugLogger.team('Early exit - already loaded for this user');
      setIsLoading(false);
      return;
    }

    debugLogger.team('Starting team data load for user:', user.id);
    isLoadingRef.current = true;
    loadedUserRef.current = user.id;

    try {
      // Add a small delay to ensure auth state is fully established
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get user's team membership with better error handling
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .single();

      debugLogger.team('Membership query result:', { membershipData, membershipError });

      // Check if user has pending invitation FIRST before handling membership errors
      const pendingToken = localStorage.getItem('pendingInvitationToken');
      
      if (membershipError && pendingToken && pendingToken !== 'undefined') {
        debugLogger.team('No membership found but have pending token, skipping team creation');
        console.log('User has pending invitation token, waiting for invitation processing on JoinTeam page');
        
        // Don't create a personal team if there's a pending invitation
        // The invitation should be processed through the JoinTeam page
        setError(null);
        setTeam(null);
        setUserRole(null);
        setIsLoading(false);
        isLoadingRef.current = false;
        return;
      }

      if (membershipError) {
        console.error('Error loading team membership:', membershipError);
        
        // Only create personal team if no pending invitation token exists
        debugLogger.team('Creating personal team as fallback');
        const { data: newTeamData, error: createError } = await supabase.rpc(
          'get_or_create_user_team',
          { user_uuid: user.id }
        );

        if (createError) {
          console.error('Error creating team:', createError);
          setError('Failed to set up team');
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
      } else {
        if (membershipData?.teams) {
          const teamData = Array.isArray(membershipData.teams) ? membershipData.teams[0] : membershipData.teams;
          debugLogger.team('Successfully loaded team data:', { teamId: teamData.id, teamName: teamData.name });
          setTeam({
            id: teamData.id,
            name: teamData.name
          });
          setUserRole(membershipData.role);
          setError(null);

          debugLogger.team('Loading team members for team:', teamData.id);
          // Load team members for ALL team members (not just admins)
          await loadTeamMembers(teamData.id);
          
          // Load pending invitations only if user is admin
          if (membershipData.role === 'admin') {
            debugLogger.team('Loading pending invitations for admin');
            await loadPendingInvitations(teamData.id);
          }
        } else {
          console.log('No team found, creating one...');
          // User has no team, create one
          const { data: newTeamData, error: createError } = await supabase.rpc(
            'get_or_create_user_team',
            { user_uuid: user.id }
          );

          if (createError) {
            console.error('Error creating team:', createError);
            setError('Failed to create team');
            // Set loading to false even on error so UI doesn't hang
            setIsLoading(false);
            isLoadingRef.current = false;
          } else if (newTeamData) {
            console.log('Team created, reloading data...');
            // Reload team data after team creation
            setTimeout(() => {
              loadedUserRef.current = null;
              isLoadingRef.current = false;
              loadTeamData();
            }, 1000);
            return;
          } else {
            // If team creation returns null/undefined, still mark as complete
            console.log('Team creation returned null, marking as complete');
            setError('Team creation failed');
            setIsLoading(false);
            isLoadingRef.current = false;
          }
        }
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
      
      // Reload team data after successful invitation acceptance
      loadedUserRef.current = null;
      isLoadingRef.current = false;
      setTimeout(() => loadTeamData(), 500);
      return { success: true };
    } catch (error) {
      return { error: 'Failed to accept invitation' };
    }
  };

  // Load team data when user changes, with better handling and debouncing
  useEffect(() => {
    // Only load if we don't have a cached result for this user
    if (user?.id && user.id !== loadedUserRef.current && !isLoadingRef.current) {
      // Only log initial team loads to reduce noise
      if (!loadedUserRef.current) {
        debugLogger.team('Initial team load for user:', user.id);
      }
      setIsLoading(true);
      setTimeout(() => loadTeamData(), 100);
    } else if (!user?.id) {
      setTeam(null);
      setTeamMembers([]);
      setPendingInvitations([]);
      setUserRole(null);
      setIsLoading(false);
      setError(null);
      loadedUserRef.current = null;
      isLoadingRef.current = false;
    }
    // Remove the else case to reduce console noise
  }, [user?.id]);

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
          loadTeamData();
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
    teamMembers,
    pendingInvitations,
    userRole,
    isLoading,
    loading: isLoading, // Alias for backward compatibility
    error,
    loadTeamData,
    inviteTeamMember,
    revokeInvitation,
    getTransferPreview,
    removeTeamMemberWithTransfer,
    acceptInvitation
  };
};
