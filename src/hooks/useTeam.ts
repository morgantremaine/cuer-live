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
  expires_at: string;
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
    if (!user || isLoadingRef.current) {
      return;
    }

    // Only load if user has changed
    if (lastUserIdRef.current === user.id) {
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
      // Fetch team membership with retry logic
      let membership;
      let membershipError;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const result = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', user.id)
          .abortSignal(signal)
          .maybeSingle();

        membership = result.data;
        membershipError = result.error;

        if (signal.aborted) return;

        if (!membershipError) {
          break;
        }

        console.warn(`Team membership query attempt ${retryCount + 1} failed:`, membershipError);
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (membershipError) {
        console.error('Error fetching team membership after retries:', membershipError);
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

      console.log('Accepting invitation with token:', token);
      console.log('Current user:', user.id, user.email);

      // Wait a moment for profile to be created if needed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // First, verify the user has a profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user profile:', profileError);
        return { error: 'Failed to verify user profile. Please try again.' };
      }

      if (!userProfile) {
        console.log('User profile not found, creating one...');
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || null
          });

        if (createProfileError) {
          console.error('Error creating user profile:', createProfileError);
          return { error: 'Failed to create user profile. Please try again.' };
        }
        
        // Wait for profile creation to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
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

      console.log('Found invitation:', invitation);

      // Check if already a member
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', invitation.team_id)
        .maybeSingle();

      if (membershipCheckError) {
        console.error('Error checking existing membership:', membershipCheckError);
      }

      if (existingMembership) {
        console.log('User is already a member, marking invitation as accepted');
        await supabase
          .from('team_invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);
        
        return { error: 'You are already a member of this team.' };
      }

      // Add user to team
      console.log('Adding user to team:', {
        user_id: user.id,
        team_id: invitation.team_id,
        role: 'member'
      });

      const { data: insertResult, error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          team_id: invitation.team_id,
          role: 'member'
        })
        .select()
        .single();

      if (memberError) {
        console.error('Error adding team member:', memberError);
        console.error('Error details:', {
          code: memberError.code,
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint
        });
        
        // Handle specific error cases
        if (memberError.code === '23503') {
          return { error: 'User account verification failed. Please try signing out and back in.' };
        } else if (memberError.code === '23505') {
          // Unique constraint violation - user already exists
          console.log('User already in team (unique constraint), marking invitation as accepted');
          await supabase
            .from('team_invitations')
            .update({ accepted: true })
            .eq('id', invitation.id);
          return { error: 'You are already a member of this team.' };
        }
        
        return { error: 'Failed to join team. Please try again.' };
      }

      console.log('Successfully added to team:', insertResult);

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error marking invitation as accepted:', updateError);
      }

      console.log('Successfully joined team, reloading team data...');

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
