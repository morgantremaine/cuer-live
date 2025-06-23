import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface PendingInvitation {
  id: string;
  team_id: string;
  email: string;
  created_at: string;
}

interface TransferPreview {
  member_email: string;
  member_name: string | null;
  rundown_count: number;
  blueprint_count: number;
  will_delete_account: boolean;
}

export const useTeam = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to prevent unnecessary re-renders and track loading states
  const isLoadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadTeamData = useCallback(async () => {
    if (!user || isLoadingRef.current || lastUserIdRef.current === user.id) {
      return;
    }

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    isLoadingRef.current = true;
    lastUserIdRef.current = user.id;
    setLoading(true);
    
    console.log('Loading team data for user:', user.id);

    try {
      // Fetch team membership
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .abortSignal(signal)
        .maybeSingle();

      if (signal.aborted) return;

      if (membershipError) {
        console.error('Error fetching team membership:', membershipError);
        setTeam(null);
        setTeamMembers([]);
        setPendingInvitations([]);
        setUserRole(null);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      if (!membership) {
        console.log('No team membership found for user');
        setTeam(null);
        setTeamMembers([]);
        setPendingInvitations([]);
        setUserRole(null);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', membership.team_id)
        .abortSignal(signal)
        .single();

      if (signal.aborted) return;

      if (teamError) {
        console.error('Error fetching team data:', teamError);
        throw teamError;
      }

      console.log('Found team data:', teamData);
      setTeam(teamData);
      setUserRole(membership.role);

      // Load team members and pending invitations in parallel
      await Promise.all([
        loadTeamMembers(teamData.id, signal),
        loadPendingInvitations(teamData.id, signal)
      ]);

    } catch (error: any) {
      if (error.name === 'AbortError' || signal.aborted) {
        return;
      }
      console.error('Error loading team data:', error);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [user?.id]); // Only depend on user.id, not the entire user object

  const loadTeamMembers = useCallback(async (teamId: string, signal?: AbortSignal) => {
    console.log('Loading team members for team:', teamId);
    try {
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('id, team_id, user_id, role')
        .eq('team_id', teamId)
        .abortSignal(signal);

      if (signal?.aborted) return;

      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
        return;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log('No team members found for team ID:', teamId);
        setTeamMembers([]);
        return;
      }

      const userIds = teamMembersData.map(member => member.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .abortSignal(signal);

      if (signal?.aborted) return;

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        const membersWithoutProfiles = teamMembersData.map(member => ({
          ...member,
          profiles: { full_name: 'Unknown User', email: 'unknown@email.com' }
        }));
        setTeamMembers(membersWithoutProfiles);
        return;
      }

      const membersWithProfiles = teamMembersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          profiles: profile ? {
            full_name: profile.full_name,
            email: profile.email
          } : { full_name: 'Unknown User', email: 'unknown@email.com' }
        };
      });

      setTeamMembers(membersWithProfiles);
    } catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) {
        return;
      }
      console.error('Error loading team members:', error);
    }
  }, []);

  const loadPendingInvitations = useCallback(async (teamId?: string, signal?: AbortSignal) => {
    const currentTeamId = teamId || team?.id;
    if (!currentTeamId) {
      return;
    }

    try {
      const { data: pendingInvitationsData, error: pendingInvitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', currentTeamId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .abortSignal(signal);

      if (signal?.aborted) return;

      if (pendingInvitationsError) {
        console.error('Error fetching pending invitations:', pendingInvitationsError);
        return;
      }

      setPendingInvitations(pendingInvitationsData || []);
    } catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) {
        return;
      }
      console.error('Error loading pending invitations:', error);
      setPendingInvitations([]);
    }
  }, [team?.id]);

  const inviteTeamMember = async (email: string) => {
    if (!team?.id) {
      return { error: 'No team available. Please create a team first.' };
    }

    try {
      // Check if email already exists as a team member
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id);

      if (teamMembersData && teamMembersData.length > 0) {
        const userIds = teamMembersData.map(member => member.user_id);
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('email')
          .in('id', userIds);

        const existingEmails = profilesData?.map(profile => profile.email).filter(Boolean) || [];
        
        if (existingEmails.includes(email)) {
          return { error: 'This email is already a team member.' };
        }
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', team.id)
        .eq('email', email)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        return { error: 'An invitation has already been sent to this email address.' };
      }

      // Generate invitation
      const token = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: team.id,
          email: email,
          token: token,
          invited_by: user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        console.error('Error inserting invitation:', insertError);
        return { error: 'Failed to invite team member. Please try again.' };
      }

      // Send email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: email,
          teamName: team.name,
          inviterName: user?.user_metadata?.full_name || user?.email || 'Team Admin',
          token: token
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        return { error: 'Failed to send invitation email. Please try again.' };
      }

      await loadPendingInvitations();
      return { error: null };
    } catch (error) {
      console.error('Error in inviteTeamMember:', error);
      return { error: 'Failed to invite team member. Please try again.' };
    }
  };

  const removeTeamMemberWithTransfer = async (memberId: string) => {
    if (!team?.id) {
      return { error: 'No team available.', result: null };
    }

    try {
      const { data, error } = await supabase.functions.invoke('remove-team-member', {
        body: {
          teamId: team.id,
          memberId: memberId,
          transferToUserId: user?.id,
        },
      });

      if (error) {
        console.error('Error removing team member:', error);
        return { error: 'Failed to remove team member. Please try again.', result: null };
      }

      await loadTeamMembers(team.id);
      return { error: null, result: data };
    } catch (error) {
      console.error('Error in removeTeamMemberWithTransfer:', error);
      return { error: 'Failed to remove team member. Please try again.', result: null };
    }
  };

  const getTransferPreview = async (memberId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-transfer-preview', {
        body: {
          teamId: team?.id,
          memberId: memberId,
        },
      });

      if (error) {
        console.error('Error getting transfer preview:', error);
        return { data: null, error: 'Failed to get transfer preview. Please try again.' };
      }

      return { data: data as TransferPreview, error: null };
    } catch (error) {
      console.error('Error in getTransferPreview:', error);
      return { data: null, error: 'Failed to get transfer preview. Please try again.' };
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('Error revoking invitation:', error);
        return { error: 'Failed to revoke invitation. Please try again.' };
      }

      await loadPendingInvitations();
      return { error: null };
    } catch (error) {
      console.error('Error in revokeInvitation:', error);
      return { error: 'Failed to revoke invitation. Please try again.' };
    }
  };

  const resendInvitation = async (invitationId: string, email: string) => {
    if (!team?.id) {
      return { error: 'No team available.' };
    }

    try {
      const { data: invitation, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('team_id', team.id)
        .eq('accepted', false)
        .single();

      if (fetchError || !invitation) {
        return { error: 'Invitation not found or already accepted.' };
      }

      // Generate new token
      const newToken = crypto.randomUUID();
      
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ 
          token: newToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        return { error: 'Failed to update invitation. Please try again.' };
      }

      // Send new email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          teamName: team.name || 'Your Team',
          inviterName: user?.user_metadata?.full_name || user?.email || 'Team Admin',
          token: newToken
        }
      });

      if (emailError) {
        return { error: 'Failed to send invitation email. Please try again.' };
      }

      await loadPendingInvitations();
      return { error: null };
    } catch (error) {
      console.error('Error in resendInvitation:', error);
      return { error: 'Failed to resend invitation. Please try again.' };
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      if (!user) {
        return { error: 'You must be logged in to accept an invitation.' };
      }

      // Get invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching invitation:', fetchError);
        return { error: 'Failed to validate invitation. Please try again.' };
      }

      if (!invitation) {
        return { error: 'Invalid or expired invitation link.' };
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', invitation.team_id)
        .maybeSingle();

      if (existingMembership) {
        await supabase
          .from('team_invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);
        
        return { error: 'You are already a member of this team.' };
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          team_id: invitation.team_id,
          role: 'member'
        });

      if (memberError) {
        console.error('Error adding team member:', memberError);
        return { error: 'Failed to join team. Please try again.' };
      }

      // Mark invitation as accepted
      await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('id', invitation.id);

      // Reset loading states and reload team data
      isLoadingRef.current = false;
      lastUserIdRef.current = null;
      await loadTeamData();

      return { error: null };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { error: 'Failed to accept invitation. Please try again.' };
    }
  };

  // Debounced effect to prevent rapid successive calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTeamData();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Cancel any ongoing requests when component unmounts or user changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTeamData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    loadTeamData,
    inviteTeamMember,
    removeTeamMemberWithTransfer,
    getTransferPreview,
    revokeInvitation,
    resendInvitation,
    acceptInvitation
  };
};
