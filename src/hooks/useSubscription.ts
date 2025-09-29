import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useActiveTeam } from './useActiveTeam';

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
  const { activeTeamId } = useActiveTeam();
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
  
  // Track which user and team we've loaded data for to prevent duplicate requests
  const loadedUserRef = useRef<string | null>(null);
  const loadedTeamRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  const checkSubscription = useCallback(async () => {
    if (!user?.id || isLoadingRef.current) {
      console.log('🔍 useSubscription - Skipping check:', { userId: user?.id, isLoading: isLoadingRef.current });
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    // Prevent duplicate loading for the same user and team combination
    if (loadedUserRef.current === user.id && loadedTeamRef.current === activeTeamId) {
      console.log('🔍 useSubscription - Already loaded for this user/team combo:', { userId: user.id, teamId: activeTeamId });
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    console.log('🔍 useSubscription - Starting check for:', { userId: user.id, teamId: activeTeamId, prevUserId: loadedUserRef.current, prevTeamId: loadedTeamRef.current });
    
    isLoadingRef.current = true;
    loadedUserRef.current = user.id;
    loadedTeamRef.current = activeTeamId;

    try {
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
      
      console.log('✅ useSubscription - Setting status:', {
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier,
        max_team_members: data.max_team_members || 1,
        access_type: data.access_type === 'none' ? 'free' : (data.access_type || 'free'),
        user_role: data.user_role,
        teamId: activeTeamId
      });
      
      setStatus({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier,
        max_team_members: data.max_team_members || 1,
        subscription_end: data.subscription_end,
        grandfathered: data.grandfathered || false,
        // If access_type is 'none', treat as 'free' since all users get free tier by default
        access_type: data.access_type === 'none' ? 'free' : (data.access_type || 'free'),
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
  }, [user?.id, activeTeamId]); // Include activeTeamId as dependency

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

  // Load subscription data when user or team changes - with strict change detection
  useEffect(() => {
    console.log('🔍 useSubscription - Effect triggered:', { 
      userId: user?.id, 
      activeTeamId, 
      loadedUserId: loadedUserRef.current, 
      loadedTeamId: loadedTeamRef.current,
      isLoading: isLoadingRef.current 
    });
    
    if (user?.id && (user.id !== loadedUserRef.current || activeTeamId !== loadedTeamRef.current) && !isLoadingRef.current) {
      console.log('🔍 useSubscription - Calling checkSubscription due to user/team change');
      checkSubscription();
    } else if (!user?.id && loadedUserRef.current) {
      console.log('🔍 useSubscription - Clearing state due to no user');
      setStatus(prev => ({ ...prev, loading: false }));
      loadedUserRef.current = null;
      loadedTeamRef.current = null;
      isLoadingRef.current = false;
    }
    
    // Check for subscription success in URL params (after Stripe redirect)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success' && user?.id && !isLoadingRef.current) {
      // Wait a moment for Stripe to process, then check subscription
      setTimeout(() => {
        if (user?.id && !isLoadingRef.current) {
          loadedUserRef.current = null; // Reset to force reload
          loadedTeamRef.current = null;
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
        if (user?.id && !isLoadingRef.current && status.loading && (loadedUserRef.current !== user.id || loadedTeamRef.current !== activeTeamId)) {
          checkSubscription();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, activeTeamId, status.loading]);

  return {
    ...status,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};