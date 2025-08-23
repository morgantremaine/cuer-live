
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast.error('Authentication failed');
          navigate('/auth');
          return;
        }

        if (data.session?.user) {
          console.log('✅ User authenticated successfully');
          
          // Check if there's a pending invitation token
          const pendingToken = localStorage.getItem('pendingInvitationToken');
          
          if (pendingToken) {
            console.log('📩 Found pending invitation token, redirecting to join team page');
            
            // Don't auto-accept here anymore - let the JoinTeam page handle it
            // This ensures proper email verification and user consent
            navigate(`/join-team/${pendingToken}`);
            return;
          }

          // Check URL params for various flows
          const type = searchParams.get('type');
          const next = searchParams.get('next');
          
          if (type === 'signup') {
            toast.success('Account created successfully!');
          } else if (type === 'recovery') {
            toast.success('Password updated successfully!');
          } else if (type === 'email_change') {
            toast.success('Email updated successfully!');
          }
          
          // Navigate to the next URL or dashboard
          navigate(next || '/dashboard');
        } else {
          console.log('No session found, redirecting to auth');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast.error('Authentication error occurred');
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
};
