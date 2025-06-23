
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

      console.log('Processing pending invitation as fallback');

      try {
        // Wait for any auth operations to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await loadTeamData();
        
        // Small delay to ensure team data is loaded
        setTimeout(async () => {
          await loadRundowns();
        }, 1000);
        
        // Clear the token after processing
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
        // Don't clear token if processing failed
      }
    };

    // Only run after a delay to ensure auth state is stable
    const timer = setTimeout(handlePendingInvitation, 3000);
    return () => clearTimeout(timer);
  }, [user, loadTeamData, loadRundowns, toast, navigate, location.pathname]);
};
