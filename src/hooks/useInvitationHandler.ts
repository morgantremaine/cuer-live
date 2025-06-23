
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
    // Only run as fallback if we're not on the JoinTeam page
    // The JoinTeam page should handle its own invitation flow primarily
    if (location.pathname.startsWith('/join-team/')) {
      console.log('On JoinTeam page, letting JoinTeam handle invitation processing');
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

      console.log('Processing pending invitation as fallback for user:', user.email);

      try {
        // Import the acceptInvitation function dynamically to avoid circular deps
        const { useTeam } = await import('./useTeam');
        
        // This is a fallback mechanism - the main flow should happen in JoinTeam
        // But if somehow a user ends up here with a pending token, we'll process it
        await loadTeamData();
        
        // Check if token was cleared (meaning invitation was processed)
        const stillPending = localStorage.getItem('pendingInvitationToken');
        if (!stillPending) {
          console.log('Invitation processed successfully via fallback, reloading rundowns...');
          
          // Add a small delay to ensure team data is fully loaded before reloading rundowns
          setTimeout(async () => {
            await loadRundowns();
          }, 1000);
          
          toast({
            title: 'Success',
            description: 'Successfully joined the team! Your team data is now available.',
          });
          
          // Navigate to dashboard after successful join if not already there
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard');
          }
        } else {
          // Token is still there, which might mean the invitation failed or is invalid
          console.log('Invitation token still present after fallback processing, checking validity...');
          
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
        console.error('Error processing pending invitation in fallback:', error);
        
        // Don't clear the token here - let the user try again or use the proper JoinTeam flow
        console.log('Fallback invitation processing failed, user should use JoinTeam page');
      }
    };

    // Longer delay to ensure auth state is fully established and give JoinTeam page priority
    const timer = setTimeout(handlePendingInvitation, 3000);
    return () => clearTimeout(timer);
  }, [user, loadTeamData, loadRundowns, toast, navigate, location.pathname]);
};
