import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useToast } from './use-toast';

export interface PendingInvitationForMe {
  id: string;
  token: string;
  team_id: string;
  team_name: string;
  role: string;
  invited_by_name: string | null;
  invited_by_email: string;
  created_at: string;
  expires_at: string;
}

export const usePendingInvitationsForMe = () => {
  const { user } = useAuth();
  const { acceptInvitation, switchToTeam, loadTeamData } = useTeam();
  const { toast } = useToast();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationForMe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [isDeclining, setIsDeclining] = useState<string | null>(null);

  const loadPendingInvitations = useCallback(async () => {
    if (!user?.email) {
      setPendingInvitations([]);
      setIsLoading(false);
      return;
    }

    try {
      // Query invitations for this user's email
      const { data: invitations, error: invitationsError } = await supabase
        .from('team_invitations')
        .select(`
          id,
          token,
          team_id,
          role,
          invited_by,
          created_at,
          expires_at
        `)
        .eq('email', user.email)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString());

      if (invitationsError) {
        console.error('Error loading pending invitations for me:', invitationsError);
        setPendingInvitations([]);
        setIsLoading(false);
        return;
      }

      if (!invitations || invitations.length === 0) {
        setPendingInvitations([]);
        setIsLoading(false);
        return;
      }

      // Get team names
      const teamIds = [...new Set(invitations.map(inv => inv.team_id).filter(Boolean))];
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      const teamMap = new Map(teams?.map(t => [t.id, t.name]) || []);

      // Get inviter profiles
      const inviterIds = [...new Set(invitations.map(inv => inv.invited_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', inviterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine data
      const combined: PendingInvitationForMe[] = invitations.map(inv => {
        const inviter = inv.invited_by ? profileMap.get(inv.invited_by) : null;
        return {
          id: inv.id,
          token: inv.token,
          team_id: inv.team_id || '',
          team_name: inv.team_id ? teamMap.get(inv.team_id) || 'Unknown Team' : 'Unknown Team',
          role: inv.role || 'member',
          invited_by_name: inviter?.full_name || null,
          invited_by_email: inviter?.email || 'Unknown',
          created_at: inv.created_at || '',
          expires_at: inv.expires_at || ''
        };
      });

      setPendingInvitations(combined);
    } catch (error) {
      console.error('Error in loadPendingInvitations:', error);
      setPendingInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  const handleAcceptInvitation = useCallback(async (invitation: PendingInvitationForMe) => {
    setIsAccepting(invitation.id);
    try {
      const result = await acceptInvitation(invitation.token);
      
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return { error: result.error };
      }

      toast({
        title: 'Welcome!',
        description: `You've joined ${invitation.team_name}`,
      });

      // Remove from local state immediately
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

      // Switch to the new team
      if (result.teamId) {
        await switchToTeam(result.teamId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
      return { error: 'Failed to accept invitation' };
    } finally {
      setIsAccepting(null);
    }
  }, [acceptInvitation, switchToTeam, toast]);

  const handleDeclineInvitation = useCallback(async (invitation: PendingInvitationForMe) => {
    setIsDeclining(invitation.id);
    try {
      // Delete the invitation to decline it
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to decline invitation',
          variant: 'destructive',
        });
        return { error: error.message };
      }

      toast({
        title: 'Invitation Declined',
        description: `You declined the invitation to ${invitation.team_name}`,
      });

      // Remove from local state
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

      return { success: true };
    } catch (error) {
      console.error('Error declining invitation:', error);
      return { error: 'Failed to decline invitation' };
    } finally {
      setIsDeclining(null);
    }
  }, [toast]);

  // Load invitations when user changes
  useEffect(() => {
    loadPendingInvitations();
  }, [loadPendingInvitations]);

  // Set up realtime subscription for new invitations
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel(`my-invitations-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_invitations',
        filter: `email=eq.${user.email}`
      }, () => {
        // Reload invitations when changes occur
        loadPendingInvitations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, user?.id, loadPendingInvitations]);

  return {
    pendingInvitations,
    isLoading,
    isAccepting,
    isDeclining,
    acceptInvitation: handleAcceptInvitation,
    declineInvitation: handleDeclineInvitation,
    refresh: loadPendingInvitations,
    count: pendingInvitations.length
  };
};
