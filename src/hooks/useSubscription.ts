import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  max_team_members: number;
  subscription_end: string | null;
  grandfathered: boolean;
  access_type: 'personal' | 'team_member' | 'none';
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
    access_type: 'none',
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      
      // First sync with Stripe to ensure our database is up to date
      const { data: syncData, error: syncError } = await supabase.functions.invoke('check-subscription');
      
      if (syncError) {
        console.warn('Failed to sync with Stripe:', syncError);
        // Continue anyway, use local data
      }
      
      // Then use the database function to check subscription access
      const { data, error } = await supabase.rpc('get_user_subscription_access', {
        user_uuid: user.id
      });
      
      if (error) throw error;
      
      setStatus({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier,
        max_team_members: data.max_team_members || 1,
        subscription_end: data.subscription_end,
        grandfathered: data.grandfathered || false,
        access_type: data.access_type || 'none',
        user_role: data.user_role,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription'
      }));
    }
  }, [user]);

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

  useEffect(() => {
    checkSubscription();
    
    // Check for subscription success in URL params (after Stripe redirect)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
      // Wait a moment for Stripe to process, then check subscription
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    }
  }, [checkSubscription]);

  return {
    ...status,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};