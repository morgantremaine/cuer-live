
import { useState, useEffect, useCallback } from 'react';
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

  const loadTeamData = useCallback(async () => {
    if (!user) {
      setTeam(null);
      setTeamMembers([]);
      setPendingInvitations([]);
      setUserRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('Loading team data for user:', user.id);

    try {
      // Fetch team membership
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .single();

      if (membershipError) {
        console.error('Error fetching team membership:', membershipError);
        throw membershipError;
      }

      if (!membership) {
        console.log('No team membership found for user');
        setTeam(null);
        setTeamMembers([]);
        setPendingInvitations([]);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', membership.team_id)
        .single();

      if (teamError) {
        console.error('Error fetching team data:', teamError);
        throw teamError;
      }

      if (!teamData) {
        console.log('No team data found for team ID:', membership.team_id);
        setTeam(null);
        setTeamMembers([]);
        setPendingInvitations([]);
        setUserRole(null);
        setLoading(false);
        return;
      }

      console.log('Found team data:', teamData);
      setTeam(teamData);
      setUserRole(membership.role);

      // Load team members
      await loadTeamMembers(teamData.id);

      // Load pending invitations
      await loadPendingInvitations(teamData.id);

    } catch (error) {
      console.error('Error loading team data:', error);
      // Handle error appropriately
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadTeamMembers = useCallback(async (teamId: string) => {
    console.log('Loading team members for team:', teamId);
    try {
      // First, get team members
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('id, team_id, user_id, role')
        .eq('team_id', teamId);

      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
        return;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log('No team members found for team ID:', teamId);
        setTeamMembers([]);
        return;
      }

      console.log('Team members data:', teamMembersData);

      // Get user IDs from team members
      const userIds = teamMembersData.map(member => member.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Still set team members even if profiles fail
        const membersWithoutProfiles = teamMembersData.map(member => ({
          ...member,
          profiles: { full_name: 'Unknown User', email: 'unknown@email.com' }
        }));
        setTeamMembers(membersWithoutProfiles);
        return;
      }

      console.log('Profiles data:', profilesData);

      // Join the data
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

      console.log('Final team members with profiles:', membersWithProfiles);
      setTeamMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }, []);

  const loadPendingInvitations = useCallback(async (teamId?: string) => {
    const currentTeamId = teamId || team?.id;
    if (!currentTeamId) {
      console.warn('No team ID available to load pending invitations.');
      return;
    }

    console.log('Loading pending invitations for team:', currentTeamId);
    try {
      // First get all team member emails to exclude them from pending invitations
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles!inner(email)
        `)
        .eq('team_id', currentTeamId);

      const existingMemberEmails = teamMembersData?.map(member => 
        member.profiles?.email
      ).filter(Boolean) || [];

      console.log('Existing member emails:', existingMemberEmails);

      // Get pending invitations, excluding emails that already have team members
      const { data: pendingInvitationsData, error: pendingInvitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', currentTeamId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .not('email', 'in', `(${existingMemberEmails.map(email => `"${email}"`).join(',')})`);

      if (pendingInvitationsError) {
        console.error('Error fetching pending invitations:', pendingInvitationsError);
        return;
      }

      if (!pendingInvitationsData) {
        console.log('No pending invitations found for team ID:', currentTeamId);
        setPendingInvitations([]);
        return;
      }

      console.log('Filtered pending invitations:', pendingInvitationsData);
      setPendingInvitations(pendingInvitationsData);
    } catch (error) {
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
      const { data: existingMember } = await supabase
        .from('team_members')
        .select(`
          id,
          profiles!inner(email)
        `)
        .eq('team_id', team.id)
        .eq('profiles.email', email)
        .maybeSingle();

      if (existingMember) {
        return { error: 'This email is already a team member.' };
      }

      // Check if there's already a pending invitation for this email
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

      // Generate a unique token
      const token = crypto.randomUUID();

      // Insert the invitation into the database
      const { error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: team.id,
          email: email,
          token: token,
          invited_by: user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
        });

      if (insertError) {
        console.error('Error inserting invitation:', insertError);
        return { error: 'Failed to invite team member. Please try again.' };
      }

      // Send email using Supabase Function
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

      // Refresh pending invitations
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
      // Get transfer preview to determine counts before deletion
      const { data: transferPreview, error: previewError } = await getTransferPreview(memberId);
      if (previewError || !transferPreview) {
        console.error('Error fetching transfer preview:', previewError);
        return { error: 'Failed to fetch transfer preview.', result: null };
      }

      // Call Supabase function to handle the removal and transfer
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

      // Refresh team members and pending invitations
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

      // Refresh pending invitations
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
      console.log('Resending invitation to:', email);
      
      // Verify the invitation exists and belongs to this team
      const { data: invitation, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('team_id', team.id)
        .eq('accepted', false)
        .single();

      if (fetchError || !invitation) {
        console.error('Invitation not found or invalid:', fetchError);
        return { error: 'Invitation not found or already accepted.' };
      }

      // Generate a new token for the invitation
      const newToken = crypto.randomUUID();
      console.log('Generated new invitation token:', newToken);
      
      // Update the invitation with new token and reset expiry
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ 
          token: newToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .eq('id', invitationId)
        .eq('team_id', team.id); // Add team_id check for security

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return { error: 'Failed to update invitation. Please try again.' };
      }

      // Send the new invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          teamName: team.name || 'Your Team',
          inviterName: user?.user_metadata?.full_name || user?.email || 'Team Admin',
          token: newToken
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        return { error: 'Failed to send invitation email. Please try again.' };
      }

      // Refresh the pending invitations
      await loadPendingInvitations();
      
      return { error: null };
    } catch (error) {
      console.error('Error in resendInvitation:', error);
      return { error: 'Failed to resend invitation. Please try again.' };
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      console.log('Accepting invitation with token:', token);
      
      // Get the invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !invitation) {
        console.error('Invalid or expired invitation:', fetchError);
        return { error: 'Invalid or expired invitation link.' };
      }

      if (!user) {
        return { error: 'You must be logged in to accept an invitation.' };
      }

      // Check if user is already a team member
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', invitation.team_id)
        .single();

      if (existingMembership) {
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
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Don't return error here as the user was successfully added to the team
      }

      // Reload team data
      await loadTeamData();

      return { error: null };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { error: 'Failed to accept invitation. Please try again.' };
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [user, loadTeamData]);

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
