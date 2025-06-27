
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface TeamData {
  team: Team | null;
  members: TeamMember[];
  pendingInvitations: any[];
  userRole: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useTeam = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teamData, setTeamData] = useState<TeamData>({
    team: null,
    members: [],
    pendingInvitations: [],
    userRole: null,
    isLoading: true,
    error: null
  });

  // Use refs to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const lastLoadedUserRef = useRef<string | null>(null);

  // Debounced load function to prevent excessive calls
  const debouncedLoadTeamData = useCallback(async () => {
    if (!user || isLoadingRef.current) {
      return;
    }

    // Check if we already loaded for this user
    if (lastLoadedUserRef.current === user.id) {
      return;
    }

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Set a debounce timeout
    loadTimeoutRef.current = setTimeout(async () => {
      if (isLoadingRef.current) return;
      
      isLoadingRef.current = true;
      lastLoadedUserRef.current = user.id;
      
      console.log('Loading team data for user:', user.id);
      
      try {
        setTeamData(prev => ({ ...prev, isLoading: true, error: null }));

        // Check for pending invitation first
        const pendingToken = localStorage.getItem('pendingInvitationToken');
        if (pendingToken) {
          console.log('Processing pending invitation token...');
          try {
            const { data: invitationData } = await supabase.rpc('accept_team_invitation_safe', {
              invitation_token: pendingToken
            });

            if (invitationData?.success) {
              localStorage.removeItem('pendingInvitationToken');
              console.log('Successfully accepted team invitation');
              
              toast({
                title: 'Welcome to the team!',
                description: 'You have successfully joined the team.',
              });
            } else if (invitationData?.error && !invitationData.error.includes('already a member')) {
              console.error('Failed to accept invitation:', invitationData.error);
              localStorage.removeItem('pendingInvitationToken');
            }
          } catch (error) {
            console.error('Error processing invitation:', error);
            localStorage.removeItem('pendingInvitationToken');
          }
        }

        // Get user's team membership
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
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (membershipError && membershipError.code !== 'PGRST116') {
          throw membershipError;
        }

        if (!membershipData) {
          // Create a new team for the user
          console.log('No team found, creating new team...');
          const userEmail = user.email || 'User';
          const teamName = `${userEmail.split('@')[0]}'s Team`;

          const { data: newTeam, error: teamError } = await supabase
            .from('teams')
            .insert({ name: teamName })
            .select()
            .single();

          if (teamError) throw teamError;

          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              user_id: user.id,
              team_id: newTeam.id,
              role: 'admin'
            });

          if (memberError) throw memberError;

          setTeamData({
            team: newTeam,
            members: [],
            pendingInvitations: [],
            userRole: 'admin',
            isLoading: false,
            error: null
          });
          return;
        }

        // Fix: Extract the team object from the array properly
        const teamRecord = membershipData.teams as any;
        const team: Team = {
          id: teamRecord.id,
          name: teamRecord.name,
          created_at: teamRecord.created_at,
          updated_at: teamRecord.updated_at
        };
        const userRole = membershipData.role;

        // Load team members - Fix the query to properly join with profiles
        const { data: teamMembersData, error: teamMembersError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            role,
            joined_at
          `)
          .eq('team_id', team.id)
          .order('joined_at');

        if (teamMembersError) throw teamMembersError;

        // Get profiles separately to avoid complex join issues
        const members: TeamMember[] = [];
        if (teamMembersData && teamMembersData.length > 0) {
          const userIds = teamMembersData.map(member => member.user_id);
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          if (profilesError) {
            console.warn('Error loading profiles:', profilesError);
          }

          // Combine team member data with profiles
          teamMembersData.forEach(member => {
            const profile = profilesData?.find(p => p.id === member.user_id);
            members.push({
              id: member.id,
              user_id: member.user_id,
              role: member.role,
              joined_at: member.joined_at,
              profiles: profile ? {
                full_name: profile.full_name,
                email: profile.email
              } : undefined
            });
          });
        }

        // Load pending invitations if user is admin
        let pendingInvitations: any[] = [];
        if (userRole === 'admin') {
          const { data: invitationsData } = await supabase
            .from('team_invitations')
            .select('*')
            .eq('team_id', team.id)
            .eq('accepted', false)
            .gt('expires_at', new Date().toISOString());

          pendingInvitations = invitationsData || [];
        }

        setTeamData({
          team,
          members,
          pendingInvitations,
          userRole,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('Error loading team data:', error);
        setTeamData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load team data'
        }));
      } finally {
        isLoadingRef.current = false;
      }
    }, 500); // Increased debounce timeout
  }, [user, toast]);

  // Load team data when user changes, but only if it's actually different
  useEffect(() => {
    if (user && user.id !== lastLoadedUserRef.current) {
      debouncedLoadTeamData();
    }
  }, [user, debouncedLoadTeamData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Memoized functions to prevent unnecessary re-renders
  const loadTeamData = useCallback(() => {
    lastLoadedUserRef.current = null; // Reset to force reload
    debouncedLoadTeamData();
  }, [debouncedLoadTeamData]);

  const inviteTeamMember = useCallback(async (email: string) => {
    if (!teamData.team || !user) return { success: false, error: 'No team or user' };

    try {
      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: {
          email,
          teamId: teamData.team.id,
          invitedBy: user.id
        }
      });

      if (error) throw error;

      // Reload team data to get updated invitations
      loadTeamData();

      return { success: true, data };
    } catch (error) {
      console.error('Error inviting team member:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send invitation' 
      };
    }
  }, [teamData.team, user, loadTeamData]);

  const acceptInvitation = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_team_invitation_safe', {
        invitation_token: token
      });

      if (error) throw error;

      if (!data?.success) {
        return { error: data?.error || 'Failed to accept invitation' };
      }

      // Reload team data after accepting invitation
      loadTeamData();
      return { error: null };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { error: error instanceof Error ? error.message : 'Failed to accept invitation' };
    }
  }, [loadTeamData]);

  const removeTeamMemberWithTransfer = useCallback(async (memberId: string) => {
    if (!teamData.team || !user) return { error: 'No team or user' };

    try {
      const { data, error } = await supabase.rpc('remove_team_member_with_transfer', {
        member_id: memberId,
        admin_id: user.id,
        team_id_param: teamData.team.id
      });

      if (error) throw error;

      if (data?.error) {
        return { error: data.error };
      }

      // Reload team data
      loadTeamData();
      return { error: null, result: data };
    } catch (error) {
      console.error('Error removing team member:', error);
      return { error: error instanceof Error ? error.message : 'Failed to remove team member' };
    }
  }, [teamData.team, user, loadTeamData]);

  const getTransferPreview = useCallback(async (memberId: string) => {
    if (!teamData.team) return { error: 'No team' };

    try {
      const { data, error } = await supabase.rpc('get_member_transfer_preview', {
        member_id: memberId,
        team_id_param: teamData.team.id
      });

      if (error) throw error;

      if (data?.error) {
        return { error: data.error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error getting transfer preview:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get transfer preview' };
    }
  }, [teamData.team]);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      // Reload team data
      loadTeamData();
      return { error: null };
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return { error: error instanceof Error ? error.message : 'Failed to revoke invitation' };
    }
  }, [loadTeamData]);

  return {
    ...teamData,
    teamMembers: teamData.members, // Add alias for backward compatibility
    loading: teamData.isLoading, // Add alias for backward compatibility
    loadTeamData,
    inviteTeamMember,
    acceptInvitation,
    removeTeamMemberWithTransfer,
    getTransferPreview,
    revokeInvitation
  };
};
