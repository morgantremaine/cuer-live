
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Load team data
  const loadTeamData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's team memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams!inner (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .limit(1);

      if (membershipError) {
        console.error('Error loading team memberships:', membershipError);
        return;
      }

      if (!memberships || memberships.length === 0) {
        console.log('No team memberships found, creating team...');
        await createDefaultTeam();
        return;
      }

      const teamData = memberships[0].teams as Team;
      setTeam(teamData);

      // Load team members
      await loadTeamMembers(teamData.id);
      
      // Load pending invitations if user is admin
      if (memberships[0].role === 'admin') {
        await loadPendingInvitations(teamData.id);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create default team for new users
  const createDefaultTeam = useCallback(async () => {
    if (!user) return;

    try {
      const teamName = user.email ? `${user.email.split('@')[0]}'s Team` : 'My Team';
      
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({ name: teamName })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add user as admin
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          team_id: newTeam.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      setTeam(newTeam);
      await loadTeamMembers(newTeam.id);
      console.log('✅ Default team created successfully');
    } catch (error) {
      console.error('❌ Error creating default team:', error);
      toast.error('Failed to create team');
    }
  }, [user]);

  // Load team members
  const loadTeamMembers = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          joined_at,
          profiles!inner (
            full_name,
            email
          )
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }, []);

  // Load pending invitations
  const loadPendingInvitations = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  }, []);

  // Send team invitation
  const sendInvitation = useCallback(async (email: string) => {
    if (!team || !user) {
      toast.error('Team not available');
      return false;
    }

    setInviteLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email: email.toLowerCase().trim(),
          teamId: team.id,
          inviterName: user.email
        }
      });

      if (error) {
        console.error('Error sending invitation:', error);
        toast.error(error.message || 'Failed to send invitation');
        return false;
      }

      if (data?.success) {
        toast.success(`Invitation sent to ${email}`);
        // Reload pending invitations to show the new one
        await loadPendingInvitations(team.id);
        return true;
      } else {
        console.error('Invitation failed:', data);
        toast.error(data?.error || 'Failed to send invitation');
        return false;
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
      return false;
    } finally {
      setInviteLoading(false);
    }
  }, [team, user, loadPendingInvitations]);

  // Remove team member
  const removeMember = useCallback(async (memberId: string) => {
    if (!team) return false;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Team member removed');
      await loadTeamMembers(team.id);
      return true;
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
      return false;
    }
  }, [team, loadTeamMembers]);

  // Delete pending invitation
  const deleteInvitation = useCallback(async (invitationId: string) => {
    if (!team) return false;

    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      await loadPendingInvitations(team.id);
      return true;
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Failed to cancel invitation');
      return false;
    }
  }, [team, loadPendingInvitations]);

  // Load team data when user changes
  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  return {
    team,
    teamMembers,
    pendingInvitations,
    loading,
    inviteLoading,
    sendInvitation,
    removeMember,
    deleteInvitation,
    reloadTeam: loadTeamData
  };
};
