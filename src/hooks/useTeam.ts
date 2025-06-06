
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

      // Load team memberships using the new simplified RLS
      const { data: membershipData, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error loading team memberships:', membershipError);
        setLoading(false);
        return;
      }

      console.log('Team memberships loaded:', membershipData);

      if (membershipData && membershipData.length > 0) {
        // Use the first team (users should have been given a default team)
        const membership = membershipData[0];
        const teamData = membership.teams as any;
        
        setTeam({
          id: teamData.id,
          name: teamData.name,
          created_at: teamData.created_at,
          updated_at: teamData.updated_at
        });
        setUserRole(membership.role as 'admin' | 'member');

        // Load all team members for this team
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            team_id,
            role,
            joined_at,
            profiles (
              email,
              full_name
            )
          `)
          .eq('team_id', teamData.id);

        if (membersError) {
          console.error('Error loading team members:', membersError);
        } else {
          const mappedMembers: TeamMember[] = (membersData || []).map(member => {
            let profileData: { email: string; full_name: string | null } | undefined;
            
            if (member.profiles) {
              if (Array.isArray(member.profiles)) {
                const firstProfile = member.profiles[0] as { email: string; full_name: string | null } | undefined;
                profileData = firstProfile ? {
                  email: firstProfile.email,
                  full_name: firstProfile.full_name
                } : undefined;
              } else {
                const profileObj = member.profiles as { email: string; full_name: string | null };
                profileData = {
                  email: profileObj.email,
                  full_name: profileObj.full_name
                };
              }
            }

            return {
              id: member.id,
              user_id: member.user_id,
              team_id: member.team_id,
              role: member.role as 'admin' | 'member',
              joined_at: member.joined_at,
              profiles: profileData
            };
          });
          
          setTeamMembers(mappedMembers);
        }

        // Load pending invitations if user is admin
        if (membership.role === 'admin') {
          const { data: invitationsData, error: invitationsError } = await supabase
            .from('team_invitations')
            .select('*')
            .eq('team_id', teamData.id)
            .eq('accepted', false)
            .gt('expires_at', new Date().toISOString());

          if (invitationsError) {
            console.error('Error loading invitations:', invitationsError);
          } else {
            setPendingInvitations(invitationsData || []);
          }
        }
      } else {
        // User should have been given a default team by the migration
        // If not, create one now
        console.log('No team found for user, creating default team...');
        const { error: createError } = await createTeam('My Team');
        if (!createError) {
          // Reload team data after creation
          setTimeout(() => loadTeamData(), 500);
          return;
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
      console.log('Creating team:', teamName);

      // Create the team
      const { data: teamData, error: teamError } = await supabase
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
          user_id: user.id,
          team_id: teamData.id,
          role: 'admin'
        });

      if (memberError) {
        console.error('Error adding team admin:', memberError);
        return { error: memberError.message };
      }

      // Reload team data
      await loadTeamData();
      
      return { error: null };
    } catch (error) {
      console.error('Error in createTeam:', error);
      return { error: 'Failed to create team' };
    }
  }, [user, loadTeamData]);

  const inviteTeamMember = useCallback(async (email: string) => {
    if (!user || !team) return { error: 'User not authenticated or no team' };

    try {
      console.log('Inviting team member:', email);

      // Generate a unique token for the invitation
      const token = crypto.randomUUID();

      const { error } = await supabase
        .from('team_invitations')
        .insert({
          email,
          team_id: team.id,
          invited_by: user.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        });

      if (error) {
        console.error('Error creating invitation:', error);
        return { error: error.message };
      }

      // TODO: Send email invitation using edge function
      console.log('Invitation created with token:', token);
      
      // Reload team data to show the new invitation
      await loadTeamData();
      
      return { error: null };
    } catch (error) {
      console.error('Error in inviteTeamMember:', error);
      return { error: 'Failed to invite team member' };
    }
  }, [user, team, loadTeamData]);

  const removeTeamMember = useCallback(async (memberId: string) => {
    if (!user || !team) return { error: 'User not authenticated or no team' };

    try {
      console.log('Removing team member:', memberId);

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
      
      return { error: null };
    } catch (error) {
      console.error('Error in removeTeamMember:', error);
      return { error: 'Failed to remove team member' };
    }
  }, [user, team, loadTeamData]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      console.log('Accepting invitation with token:', token);

      // First, verify the invitation exists and is valid
      const { data: invitationData, error: invitationError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invitationError || !invitationData) {
        console.error('Invalid invitation:', invitationError);
        return { error: 'Invalid or expired invitation' };
      }

      // Add the user to the team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          team_id: invitationData.team_id,
          role: 'member'
        });

      if (memberError) {
        console.error('Error joining team:', memberError);
        return { error: memberError.message };
      }

      // Mark the invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('id', invitationData.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        // Don't return error here since the user was successfully added
      }

      // Reload team data
      await loadTeamData();
      
      return { error: null };
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
