
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useRundownStorage } from './useRundownStorage';
import { useToast } from './use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

export const useInvitationHandler = () => {
  const { user } = useAuth();
  const { loadTeamData } = useTeam();
  const { loadRundowns } = useRundownStorage();
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

      // Let useTeam handle the invitation acceptance via loadTeamData
      // This ensures proper team loading and prevents duplicate team creation
      try {
        await loadTeamData();
        
        // Check if token was cleared (meaning invitation was processed)
        const stillPending = localStorage.getItem('pendingInvitationToken');
        if (!stillPending) {
          // Force reload rundowns after successful team join
          console.log('Invitation processed successfully, reloading rundowns...');
          await loadRundowns();
          
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
  }, [user, loadTeamData, loadRundowns, toast, navigate, location.pathname]);
};
