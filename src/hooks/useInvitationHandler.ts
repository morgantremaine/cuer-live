
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';

export const useInvitationHandler = () => {
  const { user } = useAuth();
  const { acceptInvitation } = useTeam();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePendingInvitation = async () => {
      if (!user) return;

      const pendingToken = localStorage.getItem('pendingInvitationToken');
      if (!pendingToken) return;

      console.log('Processing pending invitation for user:', user.email);

      try {
        const { error } = await acceptInvitation(pendingToken);
        
        if (error) {
          console.log('Invalid invitation:', error);
          // Clear the invalid token from localStorage
          localStorage.removeItem('pendingInvitationToken');
          
          // Don't show error toast for invalid invitations - they might just be expired
          console.warn('Cleared invalid invitation token');
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
        // Clear the token on any error to prevent repeated attempts
        localStorage.removeItem('pendingInvitationToken');
      }
    };

    // Small delay to ensure auth state is fully established
    const timer = setTimeout(handlePendingInvitation, 1000);
    return () => clearTimeout(timer);
  }, [user, acceptInvitation, toast, navigate]);
};
