
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

    isLoadingRef.current = true;
    loadedUserRef.current = user.id;

    try {
      // Get user's team membership
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
        setError('Failed to load team data');
        setTeam(null);
        setUserRole(null);
      } else {
        // Check if user has pending invitation
        const pendingToken = localStorage.getItem('pendingInvitationToken');
        
        if (!membershipData && pendingToken) {
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
            loadedUserRef.current = null;
            isLoadingRef.current = false;
            setTimeout(() => loadTeamData(), 100);
            return;
          }
        }

        if (membershipData?.teams) {
          const teamData = Array.isArray(membershipData.teams) ? membershipData.teams[0] : membershipData.teams;
          setTeam({
            id: teamData.id,
            name: teamData.name
          });
          setUserRole(membershipData.role);
          setError(null);

          // Load team members and pending invitations if user is admin
          if (membershipData.role === 'admin') {
            await loadTeamMembers(teamData.id);
            await loadPendingInvitations(teamData.id);
          }
        } else {
          // User has no team, create one
          const { data: newTeamData, error: createError } = await supabase.rpc(
            'get_or_create_user_team',
            { user_uuid: user.id }
          );

          if (createError) {
            console.error('Error creating team:', createError);
            setError('Failed to create team');
          } else if (newTeamData) {
            // Reload team data after team creation
            loadedUserRef.current = null;
            isLoadingRef.current = false;
            setTimeout(() => loadTeamData(), 100);
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
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner (
            email,
            full_name
          )
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error loading team members:', error);
      } else {
        // Transform the data to match the TeamMember interface
        const transformedMembers: TeamMember[] = (data || []).map(member => ({
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          profiles: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
        }));
        setTeamMembers(transformedMembers);
      }
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

    try {
      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: { email, teamId: team.id }
      });

      if (error) {
        return { error: error.message };
      }

      // Reload pending invitations
      await loadPendingInvitations(team.id);
      return { success: true };
    } catch (error) {
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
      const { data, error } = await supabase.rpc('remove_team_member_with_transfer', {
        member_id: memberId,
        admin_id: user.id,
        team_id_param: team.id
      });

      if (error) {
        return { error: error.message };
      }

      if (data.error) {
        return { error: data.error };
      }

      // Reload team members
      await loadTeamMembers(team.id);
      return { result: data };
    } catch (error) {
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

  // Load team data when user changes, but prevent duplicate loads
  useEffect(() => {
    if (user?.id && user.id !== loadedUserRef.current) {
      loadedUserRef.current = null; // Reset to allow new load
      loadTeamData();
    } else if (!user?.id) {
      setTeam(null);
      setTeamMembers([]);
      setPendingInvitations([]);
      setUserRole(null);
      setIsLoading(false);
      setError(null);
      loadedUserRef.current = null;
    }
  }, [user?.id]);

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
