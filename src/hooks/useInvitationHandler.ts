
import { useEffect, useRef } from 'react';
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
  
  // Use ref to prevent multiple simultaneous processing
  const isProcessingRef = useRef(false);
  const processedUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't run the invitation handler if we're on the JoinTeam page
    if (location.pathname.startsWith('/join-team/')) {
      console.log('On JoinTeam page, skipping invitation handler');
      return;
    }

    const handlePendingInvitation = async () => {
      // Wait for user state to be determined and prevent multiple processing
      if (user === undefined || isProcessingRef.current) {
        return;
      }

      if (!user) {
        console.log('No user logged in, skipping invitation processing');
        return;
      }

      // Check if we already processed for this user
      if (processedUserRef.current === user.id) {
        return;
      }

      const pendingToken = localStorage.getItem('pendingInvitationToken');
      if (!pendingToken) {
        console.log('No pending invitation token found');
        processedUserRef.current = user.id; // Mark as processed
        return;
      }

      console.log('Processing pending invitation for user:', user.email);
      isProcessingRef.current = true;
      processedUserRef.current = user.id;

      try {
        // Instead of auto-accepting, redirect to join team page for explicit acceptance
        console.log('Found pending invitation token, redirecting to join team page');
        
        toast({
          title: 'Team Invitation Pending',
          description: 'You have a pending team invitation. Redirecting to complete the process.',
        });
        
        // Redirect to join team page with token
        navigate(`/join-team/${pendingToken}`);
      } catch (error) {
        console.error('Error processing pending invitation:', error);
        
        // Clear the token if there's an error to prevent infinite loops
        localStorage.removeItem('pendingInvitationToken');
        
        toast({
          title: 'Error',
          description: 'Failed to process team invitation. Please try again or request a new invitation.',
          variant: 'destructive',
        });
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Use a shorter delay to ensure auth state is fully established
    const timer = setTimeout(handlePendingInvitation, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [user, loadTeamData, loadRundowns, toast, navigate, location.pathname]);

  // Reset processing flag when user changes
  useEffect(() => {
    if (user?.id !== processedUserRef.current) {
      isProcessingRef.current = false;
    }
  }, [user?.id]);
};
