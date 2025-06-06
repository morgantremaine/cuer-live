import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface TeamInvitation {
  id: string;
  email: string;
  team_id: string;
  invited_by: string;
  accepted: boolean;
  created_at: string;
  expires_at: string;
  token: string;
}

export const useTeam = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadTeamData = async () => {
    if (!user) {
      console.log('No user found, skipping team data load');
      setLoading(false);
      return;
    }

    try {
      console.log('Loading team data for user:', user.id);
      
      // Get user's team memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          joined_at,
          teams (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      console.log('Membership query result:', { membershipData, membershipError });

      if (membershipError) {
        console.error('Error fetching team memberships:', membershipError);
        setLoading(false);
        return;
      }

      if (!membershipData || membershipData.length === 0) {
        console.log('No team memberships found for user');
        // User has no team yet, create one
        await createDefaultTeam();
        return;
      }

      // Use the first team (users can only be in one team for now)
      const membership = membershipData[0];
      const teamData = membership.teams as any;
      
      console.log('Found team data:', teamData);
      console.log('User role:', membership.role);

      setTeam(teamData);
      setUserRole(membership.role);

      // Load team members
      await loadTeamMembers(teamData.id);
      
      // Load pending invitations if user is admin
      if (membership.role === 'admin') {
        await loadPendingInvitations(teamData.id);
      }

    } catch (error) {
      console.error('Error in loadTeamData:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTeam = async () => {
    if (!user) return;

    try {
      console.log('Creating default team for user:', user.id);
      
      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: `${user.email?.split('@')[0] || 'User'}'s Team`
        })
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        return;
      }

      console.log('Created team:', teamData);

      // Add user as admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          team_id: teamData.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('Error adding user to team:', memberError);
        return;
      }

      console.log('Added user as admin to team');

      // Reload team data
      await loadTeamData();
    } catch (error) {
      console.error('Error creating default team:', error);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      console.log('Loading team members for team:', teamId);
      
      // First get team members
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select('id, user_id, team_id, role, joined_at')
        .eq('team_id', teamId);

      console.log('Team members query result:', { teamMembersData, teamMembersError });

      if (teamMembersError) {
        console.error('Error loading team members:', teamMembersError);
        return;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log('No team members found');
        setTeamMembers([]);
        return;
      }

      // Get user IDs to fetch profiles
      const userIds = teamMembersData.map(member => member.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      console.log('Profiles query result:', { profilesData, profilesError });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        return;
      }

      // Combine team members with their profiles
      const transformedData = teamMembersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          profiles: profile ? {
            full_name: profile.full_name,
            email: profile.email
          } : null
        };
      });

      console.log('Transformed team members data:', transformedData);
      setTeamMembers(transformedData);
    } catch (error) {
      console.error('Error in loadTeamMembers:', error);
    }
  };

  const loadPendingInvitations = async (teamId: string) => {
    try {
      console.log('Loading pending invitations for team:', teamId);
      
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString());

      console.log('Pending invitations query result:', { data, error });

      if (error) {
        console.error('Error loading pending invitations:', error);
        return;
      }

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error in loadPendingInvitations:', error);
    }
  };

  const inviteTeamMember = async (email: string) => {
    if (!team || !user) {
      return { error: 'No team or user found' };
    }

    try {
      console.log('Inviting team member:', email);
      
      // Check if user already exists in team by checking profiles
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id, user_id')
        .eq('team_id', team.id);

      if (existingMember && existingMember.length > 0) {
        // Get user IDs and check their profiles
        const userIds = existingMember.map(m => m.user_id);
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const memberEmails = profilesData?.map(p => p.email).filter(Boolean);
        
        console.log('Existing member emails:', memberEmails);
        
        if (memberEmails?.includes(email)) {
          return { error: 'User is already a member of this team' };
        }
      }

      // Generate invitation token
      const token = crypto.randomUUID();

      // Create invitation
      const { error: invitationError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: team.id,
          email,
          invited_by: user.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (invitationError) {
        console.error('Error creating invitation:', invitationError);
        return { error: 'Failed to create invitation' };
      }

      // Send invitation email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          teamName: team.name,
          inviterName: user.user_metadata?.full_name || user.email,
          invitationToken: token
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        return { error: 'Invitation created but email could not be sent' };
      }

      // Reload pending invitations
      await loadPendingInvitations(team.id);

      return { error: null };
    } catch (error) {
      console.error('Error inviting team member:', error);
      return { error: 'Failed to invite team member' };
    }
  };

  const acceptInvitation = async (token: string) => {
    if (!user) {
      return { error: 'No user logged in' };
    }

    try {
      console.log('Accepting invitation with token:', token);
      
      // Get invitation details
      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (invitationError || !invitation) {
        console.error('Invalid or expired invitation:', invitationError);
        return { error: 'Invalid or expired invitation' };
      }

      // Verify email matches
      if (invitation.email !== user.email) {
        return { error: 'Invitation email does not match your account' };
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', invitation.team_id)
        .maybeSingle();

      if (existingMember) {
        // Mark invitation as accepted and reload data
        await supabase
          .from('team_invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);
        
        await loadTeamData();
        return { error: null };
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
        console.error('Error adding user to team:', memberError);
        return { error: 'Failed to join team' };
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
      }

      // Reload team data
      await loadTeamData();

      return { error: null };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { error: 'Failed to accept invitation' };
    }
  };

  const removeTeamMember = async (memberId: string) => {
    if (!team) {
      return { error: 'No team found' };
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error removing team member:', error);
        return { error: 'Failed to remove team member' };
      }

      // Reload team members
      await loadTeamMembers(team.id);

      return { error: null };
    } catch (error) {
      console.error('Error removing team member:', error);
      return { error: 'Failed to remove team member' };
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
        return { error: 'Failed to revoke invitation' };
      }

      // Reload pending invitations
      if (team) {
        await loadPendingInvitations(team.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return { error: 'Failed to revoke invitation' };
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [user?.id]);

  return {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    inviteTeamMember,
    acceptInvitation,
    removeTeamMember,
    revokeInvitation,
    loadTeamData
  };
};
