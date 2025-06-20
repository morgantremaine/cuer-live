
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

      try {
        // Let useTeam handle the invitation acceptance via loadTeamData
        // This ensures proper team loading and prevents duplicate team creation
        await loadTeamData();
        
        // Check if token was cleared (meaning invitation was processed)
        const stillPending = localStorage.getItem('pendingInvitationToken');
        if (!stillPending) {
          // Force reload rundowns after successful team join
          console.log('Invitation processed successfully, reloading rundowns...');
          
          // Add a small delay to ensure team data is fully loaded before reloading rundowns
          setTimeout(async () => {
            await loadRundowns();
          }, 500);
          
          toast({
            title: 'Success',
            description: 'Successfully joined the team! Your team rundowns are now available.',
          });
          
          // Navigate to dashboard after successful join if not already there
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
          }
        } else {
          // Token is still there, which might mean the invitation failed or is invalid
          console.log('Invitation token still present, checking validity...');
          
          // Try to validate the token - if it's invalid, clear it
          try {
            const { validateInvitationToken } = await import('@/utils/invitationUtils');
            const isValid = await validateInvitationToken(pendingToken);
            
            if (!isValid) {
              console.log('Invalid invitation token detected, clearing it');
              localStorage.removeItem('pendingInvitationToken');
              
              toast({
                title: 'Invitation Expired',
                description: 'The invitation link has expired. Please request a new invitation.',
                variant: 'destructive',
              });
            }
          } catch (error) {
            console.error('Error validating invitation token:', error);
            localStorage.removeItem('pendingInvitationToken');
          }
        }
      } catch (error) {
        console.error('Error processing pending invitation:', error);
        
        // Clear the token if there's an error to prevent infinite loops
        localStorage.removeItem('pendingInvitationToken');
        
        toast({
          title: 'Error',
          description: 'Failed to process team invitation. Please try again or request a new invitation.',
          variant: 'destructive',
        });
      }
    };

    // Small delay to ensure auth state is fully established
    const timer = setTimeout(handlePendingInvitation, 1000);
    return () => clearTimeout(timer);
  }, [user, loadTeamData, loadRundowns, toast, navigate, location.pathname]);
};
