import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  max_team_members: number;
  subscription_end: string | null;
  grandfathered: boolean;
  access_type: 'personal' | 'team_member' | 'free' | 'none';
  user_role?: 'admin' | 'member';
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_tier: null,
    max_team_members: 1,
    subscription_end: null,
    grandfathered: false,
    access_type: 'free',
    loading: true,
    error: null,
  });
  
  // Track which user we've loaded data for to prevent duplicate requests
  const loadedUserRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  const checkSubscription = useCallback(async () => {
    if (!user?.id || isLoadingRef.current) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    // Prevent duplicate loading for the same user
    if (loadedUserRef.current === user.id) {
      console.log('🔄 useSubscription: Skipping check - already loaded for user:', user.id);
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    isLoadingRef.current = true;
    loadedUserRef.current = user.id;

    try {
      console.log('🔄 useSubscription: Checking subscription for user:', user.id);
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      
      // First sync with Stripe to ensure our database is up to date
      const { data: syncData, error: syncError } = await supabase.functions.invoke('check-subscription');
      
      if (syncError) {
        console.warn('Failed to sync with Stripe:', syncError);
        
        // If it's an auth error (401, 403), the session is invalid
        if (syncError.message?.includes('401') || syncError.message?.includes('403') || 
            syncError.message?.includes('Authentication') || syncError.message?.includes('Forbidden') ||
            syncError.message?.includes('Invalid or expired session')) {
          console.warn('Authentication failed - session may be expired');
          setStatus({
            subscribed: false,
            subscription_tier: null,
            max_team_members: 1,
            subscription_end: null,
            grandfathered: false,
            access_type: 'free',
            loading: false,
            error: null,
          });
          return;
        }
        // Continue anyway for other errors, use local data
      }
      
      // Then use the database function to check subscription access
      const { data, error } = await supabase.rpc('get_user_subscription_access', {
        user_uuid: user.id
      });
      
      if (error) {
        // Check if it's also an auth error
        if (error.message?.includes('JWT') || error.message?.includes('authentication') || 
            error.message?.includes('permission')) {
          console.warn('Database authentication failed - session may be expired');
          setStatus({
            subscribed: false,
            subscription_tier: null,
            max_team_members: 1,
            subscription_end: null,
            grandfathered: false,
            access_type: 'free',
            loading: false,
            error: null,
          });
          return;
        }
        throw error;
      }
      
      setStatus({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier,
        max_team_members: data.max_team_members || 1,
        subscription_end: data.subscription_end,
        grandfathered: data.grandfathered || false,
        access_type: data.access_type || 'free',
        user_role: data.user_role,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      
      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('JWT') || errorMessage.includes('authentication') || 
          errorMessage.includes('401') || errorMessage.includes('403')) {
        console.warn('Authentication error detected - clearing subscription state');
        setStatus({
          subscribed: false,
          subscription_tier: null,
          max_team_members: 1,
          subscription_end: null,
          grandfathered: false,
          access_type: 'free',
          loading: false,
          error: null,
        });
      } else {
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, []); // Remove user dependency to prevent recreation

  const createCheckout = useCallback(async (tier: string, interval: 'monthly' | 'yearly') => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to subscribe',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier, interval }
      });
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  const openCustomerPortal = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to manage your subscription',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open customer portal',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Load subscription data when user changes
  useEffect(() => {
    if (user?.id && user.id !== loadedUserRef.current) {
      console.log('🔄 useSubscription: Loading subscription data for user change:', user.id);
      checkSubscription();
    } else if (!user?.id) {
      console.log('🔄 useSubscription: Clearing subscription data (no user)');
      setStatus(prev => ({ ...prev, loading: false }));
      loadedUserRef.current = null;
    }
    
    // Check for subscription success in URL params (after Stripe redirect)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
      // Wait a moment for Stripe to process, then check subscription
      setTimeout(() => {
        if (user?.id) {
          loadedUserRef.current = null; // Reset to force reload
          checkSubscription();
        }
      }, 2000);
    }
  }, [user?.id]); // Only depend on user.id, not the checkSubscription function

  // Handle page visibility changes to prevent unnecessary subscription checks
  useEffect(() => {
    let lastVisibilityCheck = 0;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Throttle visibility checks to max once per 5 seconds
        if (now - lastVisibilityCheck < 5000) return;
        lastVisibilityCheck = now;
        
        // Only reload if we don't have subscription data and we should have it
        if (user?.id && !isLoadingRef.current && status.loading && loadedUserRef.current !== user.id) {
          console.log('🔄 useSubscription: Reloading subscription data after visibility change');
          checkSubscription();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, status.loading]);

  return {
    ...status,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};