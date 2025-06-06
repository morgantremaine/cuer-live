
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
      // Load user's team membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select('*, teams(*)')
        .eq('user_id', user.id)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error('Error loading team membership:', membershipError);
        setLoading(false);
        return;
      }

      if (membershipData) {
        setTeam(membershipData.teams);
        setUserRole(membershipData.role);

        // Load all team members
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            *,
            profiles (
              email,
              full_name
            )
          `)
          .eq('team_id', membershipData.team_id);

        if (membersError) {
          console.error('Error loading team members:', membersError);
        } else {
          setTeamMembers(membersData || []);
        }

        // Load pending invitations if user is admin
        if (membershipData.role === 'admin') {
          const { data: invitationsData, error: invitationsError } = await supabase
            .from('team_invitations')
            .select('*')
            .eq('team_id', membershipData.team_id)
            .eq('accepted', false)
            .gt('expires_at', new Date().toISOString());

          if (invitationsError) {
            console.error('Error loading invitations:', invitationsError);
          } else {
            setPendingInvitations(invitationsData || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createTeam = useCallback(async (teamName: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({ name: teamName })
        .select()
        .single();

      if (teamError) {
        return { error: teamError.message };
      }

      // Add user as admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        return { error: memberError.message };
      }

      await loadTeamData();
      return { data: teamData };
    } catch (error) {
      return { error: 'Failed to create team' };
    }
  }, [user, loadTeamData]);

  const inviteTeamMember = useCallback(async (email: string) => {
    if (!user || !team || userRole !== 'admin') {
      return { error: 'Not authorized to invite members' };
    }

    try {
      // Generate invitation token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          email,
          team_id: team.id,
          invited_by: user.id,
          token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Call edge function to send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          inviterName: user.user_metadata?.full_name || user.email,
          teamName: team.name,
          token,
          inviteUrl: `${window.location.origin}/join-team/${token}`
        }
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't return error here as the invitation was created successfully
      }

      await loadTeamData();
      return { data };
    } catch (error) {
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
        return { error: error.message };
      }

      await loadTeamData();
      return { success: true };
    } catch (error) {
      return { error: 'Failed to remove team member' };
    }
  }, [user, userRole, loadTeamData]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        return { error: 'Invalid or expired invitation' };
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

      await loadTeamData();
      return { success: true };
    } catch (error) {
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
