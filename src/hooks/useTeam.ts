
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  team_id: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
  token: string;
}

export const useTeam = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTeamData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Loading team data for user:', user.id);

      // First, get user's team memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (*)
        `)
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error loading team memberships:', membershipError);
        setLoading(false);
        return;
      }

      console.log('User team memberships:', memberships);

      if (!memberships || memberships.length === 0) {
        // User is not in any team
        setTeam(null);
        setTeamMembers([]);
        setPendingInvitations([]);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // For now, use the first team (later we can support multiple teams)
      const userMembership = memberships[0];
      const userTeam = userMembership.teams;
      
      setTeam(userTeam);
      setUserRole(userMembership.role as 'admin' | 'member');

      // Load all team members
      const { data: allMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles!team_members_user_id_fkey (
            email,
            full_name
          )
        `)
        .eq('team_id', userTeam.id);

      if (membersError) {
        console.error('Error loading team members:', membersError);
      } else {
        setTeamMembers(allMembers || []);
      }

      // Load pending invitations (only if user is admin)
      if (userMembership.role === 'admin') {
        const { data: invitations, error: invitationsError } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_id', userTeam.id)
          .eq('accepted', false);

        if (invitationsError) {
          console.error('Error loading team invitations:', invitationsError);
        } else {
          setPendingInvitations(invitations || []);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading team data:', error);
      setLoading(false);
    }
  }, [user]);

  const createTeam = useCallback(async (teamName: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Create the team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName
        })
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        return { error: teamError.message };
      }

      // Add the creator as an admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('Error adding team creator as admin:', memberError);
        return { error: memberError.message };
      }

      // Reload team data
      await loadTeamData();
      
      return { data: newTeam };
    } catch (error) {
      console.error('Error in createTeam:', error);
      return { error: 'Failed to create team' };
    }
  }, [user, loadTeamData]);

  const inviteTeamMember = useCallback(async (email: string) => {
    if (!user || !team || userRole !== 'admin') {
      return { error: 'Not authorized to invite members' };
    }

    try {
      // Generate a unique token
      const token = crypto.randomUUID();

      // Create the invitation
      const { data: invitation, error } = await supabase
        .from('team_invitations')
        .insert({
          email,
          team_id: team.id,
          invited_by: user.id,
          token,
          accepted: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating team invitation:', error);
        return { error: error.message };
      }

      // TODO: Send email invitation using edge function
      // For now, we'll just create the invitation record

      // Reload team data to get updated invitations
      await loadTeamData();

      return { data: invitation };
    } catch (error) {
      console.error('Error in inviteTeamMember:', error);
      return { error: 'Failed to invite team member' };
    }
  }, [user, team, userRole, loadTeamData]);

  const removeTeamMember = useCallback(async (memberId: string) => {
    if (!user || userRole !== 'admin') {
      return { error: 'Not authorized to remove members' };
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error removing team member:', error);
        return { error: error.message };
      }

      // Reload team data
      await loadTeamData();

      return { success: true };
    } catch (error) {
      console.error('Error in removeTeamMember:', error);
      return { error: 'Failed to remove team member' };
    }
  }, [user, userRole, loadTeamData]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .single();

      if (findError || !invitation) {
        return { error: 'Invalid or expired invitation' };
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        return { error: 'Invitation has expired' };
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) {
        console.error('Error adding user to team:', memberError);
        return { error: memberError.message };
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
      }

      // Reload team data
      await loadTeamData();

      return { success: true };
    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      return { error: 'Failed to accept invitation' };
    }
  }, [user, loadTeamData]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  return {
    team,
    teamMembers,
    pendingInvitations,
    userRole,
    loading,
    createTeam,
    inviteTeamMember,
    removeTeamMember,
    acceptInvitation,
    refreshTeamData: loadTeamData
  };
};
