
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useRundownStorage } from './useRundownStorage';
import { useToast } from './use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { validateInvitationToken, clearInvalidTokens } from '@/utils/invitationUtils';

export const useInvitationHandler = () => {
  const { user } = useAuth();
  const { loadTeamData, acceptInvitation } = useTeam();
  const { loadRundowns } = useRundownStorage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only process fallback if not on JoinTeam page and user just authenticated
    if (location.pathname.startsWith('/join-team/')) {
      return;
    }

    const handlePendingInvitation = async () => {
      if (user === undefined || !user) {
        return;
      }

      const pendingToken = localStorage.getItem('pendingInvitationToken');
      if (!pendingToken) {
        return;
      }

      console.log('Processing pending invitation as fallback:', pendingToken);
      console.log('Current user:', user.id, user.email);

      try {
        // Validate token before processing
        const isValid = await validateInvitationToken(pendingToken);
        if (!isValid) {
          console.log('Pending token is invalid, clearing it');
          localStorage.removeItem('pendingInvitationToken');
          return;
        }

        // Wait for auth operations to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Attempting to accept invitation with token:', pendingToken);
        
        // Accept the invitation using the team hook
        const { error: acceptError } = await acceptInvitation(pendingToken);
        
        if (acceptError) {
          console.error('Failed to accept invitation:', acceptError);
          toast({
            title: 'Error',
            description: acceptError,
            variant: 'destructive',
          });
          // Don't clear the token if acceptance failed - we might retry
          return;
        }

        console.log('Successfully accepted invitation, loading team data...');
        
        // Load team data and rundowns
        await loadTeamData();
        
        // Small delay to ensure team data is loaded
        setTimeout(async () => {
          await loadRundowns();
        }, 1000);
        
        // Clear the token after successful processing
        localStorage.removeItem('pendingInvitationToken');
        
        toast({
          title: 'Success',
          description: 'Successfully joined the team!',
        });
        
        if (location.pathname !== '/dashboard') {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error processing pending invitation:', error);
        // Don't clear token on error - we might retry later
      }
    };

    // Only run after a delay to ensure auth state is stable
    const timer = setTimeout(handlePendingInvitation, 3000);
    return () => clearTimeout(timer);
  }, [user, acceptInvitation, loadTeamData, loadRundowns, toast, navigate, location.pathname]);

  // Clean up invalid tokens on mount
  useEffect(() => {
    clearInvalidTokens();
  }, []);
};
