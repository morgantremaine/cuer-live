
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useToast } from './use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export const useInvitationHandler = () => {
  const { user } = useAuth();
  const { acceptInvitation } = useTeam();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't run the invitation handler if we're on the JoinTeam page
    // The JoinTeam page should handle its own invitation flow
    if (location.pathname.startsWith('/join-team/')) {
      console.log('On JoinTeam page, skipping invitation handler');
      return;
    }

    const handlePendingInvitation = async () => {
      // Wait for user state to be determined (either logged in or null)
      if (user === undefined) {
        console.log('User state not yet determined, waiting...');
        return;
      }

      if (!user) {
        console.log('No user logged in, skipping invitation processing');
        return;
      }

      const pendingToken = localStorage.getItem('pendingInvitationToken');
      if (!pendingToken) {
        console.log('No pending invitation token found');
        return;
      }

      console.log('Processing pending invitation for user:', user.email);

      try {
        // First validate that the invitation exists and is valid
        const { data: invitationData, error: invitationError } = await supabase
          .from('team_invitations')
          .select('id, email, team_id, expires_at, accepted')
          .eq('token', pendingToken)
          .eq('accepted', false)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        console.log('Invitation validation result:', { invitationData, invitationError });

        if (invitationError) {
          console.error('Error validating invitation:', invitationError);
          localStorage.removeItem('pendingInvitationToken');
          return;
        }

        if (!invitationData) {
          console.log('Invalid or expired invitation token, clearing from storage');
          localStorage.removeItem('pendingInvitationToken');
          return;
        }

        // Validate that the invitation email matches the current user
        if (invitationData.email !== user.email) {
          console.log('Invitation email does not match current user, clearing token');
          localStorage.removeItem('pendingInvitationToken');
          return;
        }

        console.log('Valid invitation found, accepting...');
        const { error } = await acceptInvitation(pendingToken);
        
        if (error) {
          console.log('Failed to accept invitation:', error);
          localStorage.removeItem('pendingInvitationToken');
          
          // Only show error toast for unexpected errors, not expired invitations
          if (!error.includes('expired') && !error.includes('invalid')) {
            toast({
              title: 'Error',
              description: 'Failed to join team. Please try again.',
              variant: 'destructive',
            });
          }
        } else {
          localStorage.removeItem('pendingInvitationToken');
          toast({
            title: 'Success',
            description: 'Successfully joined the team!',
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error processing pending invitation:', error);
        localStorage.removeItem('pendingInvitationToken');
      }
    };

    // Small delay to ensure auth state is fully established
    const timer = setTimeout(handlePendingInvitation, 1000);
    return () => clearTimeout(timer);
  }, [user, acceptInvitation, toast, navigate, location.pathname]);
};
