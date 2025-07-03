
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

    console.log('Loading team data for user:', user.id);
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
          teams (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      console.log('Membership query result:', { membershipData, membershipError });

      if (membershipError) {
        console.error('Error loading team membership:', membershipError);
        
        // If it's a 406 error or auth issue, try to create a team instead
        if (membershipError.code === 'PGRST301' || membershipError.message?.includes('406')) {
          console.log('Auth issue detected, trying to create user team');
          const { data: newTeamData, error: createError } = await supabase.rpc(
            'get_or_create_user_team',
            { user_uuid: user.id }
          );

          if (createError) {
            console.error('Error creating team:', createError);
            setError('Failed to set up team');
          } else if (newTeamData) {
            console.log('Team created successfully, reloading...');
            // Retry loading team data
            setTimeout(() => {
              loadedUserRef.current = null;
              isLoadingRef.current = false;
              loadTeamData();
            }, 1000);
            return;
          }
        } else {
          setError('Failed to load team data');
        }
        setTeam(null);
        setUserRole(null);
      } else {
        // Check if user has pending invitation
        const pendingToken = localStorage.getItem('pendingInvitationToken');
        
        if (!membershipData && pendingToken && pendingToken !== 'undefined') {
          console.log('No team membership found, but have pending token:', pendingToken);
          // User has pending invitation, try to accept it
          const { data: acceptResult, error: acceptError } = await supabase.rpc(
            'accept_team_invitation_safe',
            { invitation_token: pendingToken }
          );

          if (acceptError) {
            console.error('Error accepting invitation:', acceptError);
            localStorage.removeItem('pendingInvitationToken');
          } else if (acceptResult?.success) {
            console.log('Invitation accepted successfully');
            localStorage.removeItem('pendingInvitationToken');
            // Reload team data after successful invitation acceptance
            setTimeout(() => {
              loadedUserRef.current = null;
              isLoadingRef.current = false;
              loadTeamData();
            }, 1000);
            return;
          }
        }

        if (membershipData?.teams) {
          const teamData = Array.isArray(membershipData.teams) ? membershipData.teams[0] : membershipData.teams;
          console.log('Setting team data:', teamData);
          setTeam({
            id: teamData.id,
            name: teamData.name
          });
          setUserRole(membershipData.role);
          setError(null);

          // Load team members for ALL team members (not just admins)
          await loadTeamMembers(teamData.id);
          
          // Load pending invitations only if user is admin
          if (membershipData.role === 'admin') {
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
          } else if (newTeamData) {
            console.log('Team created, reloading data...');
            // Reload team data after team creation
            setTimeout(() => {
              loadedUserRef.current = null;
              isLoadingRef.current = false;
              loadTeamData();
            }, 1000);
            return;
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
      const { data, error } = await supabase.rpc('accept_team_invitation_safe', {
        invitation_token: token
      });

      if (error) {
        return { error: error.message };
      }

      if (!data.success) {
        return { error: data.error };
      }

      // Reload team data after successful invitation acceptance
      loadedUserRef.current = null;
      setTimeout(() => loadTeamData(), 100);
      return { success: true };
    } catch (error) {
      return { error: 'Failed to accept invitation' };
    }
  };

  // Load team data when user changes - with aggressive loop prevention
  useEffect(() => {
    const currentUserId = user?.id;
    
    // Prevent infinite loops - only depend on user ID, not entire user object
    if (!currentUserId) {
      return;
    }
    
    // Skip if already loaded this user or currently loading
    if (currentUserId === loadedUserRef.current || isLoadingRef.current) {
      return;
    }
    
    console.log('User changed, loading team data for:', currentUserId);
    
    // Mark immediately to prevent race conditions
    loadedUserRef.current = currentUserId;
    isLoadingRef.current = true;
    setIsLoading(true);
    
    // Single timeout with proper cleanup
    const timeoutId = setTimeout(() => {
      if (loadedUserRef.current === currentUserId) {
        loadTeamData().finally(() => {
          isLoadingRef.current = false;
        });
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (isLoadingRef.current) {
        isLoadingRef.current = false;
      }
    };
  }, [user?.id]); // Only depend on user ID to prevent object recreation issues

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
