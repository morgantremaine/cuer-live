import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, RefreshCw, Settings, Users } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';

export const SubscriptionStatus = () => {
  const {
    subscribed,
    subscription_tier,
    max_team_members,
    subscription_end,
    loading,
    checkSubscription,
    openCustomerPortal,
  } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Subscription Status
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Plan:</span>
              {subscribed && subscription_tier ? (
                <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {subscription_tier}
                </Badge>
              ) : (
                <Badge variant="secondary">Free Trial</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>Up to {max_team_members} team members</span>
            </div>
            
            {subscribed && subscription_end && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Next billing: {format(new Date(subscription_end), 'MMM d, yyyy')}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkSubscription}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {subscribed && (
              <Button
                variant="outline"
                size="sm"
                onClick={openCustomerPortal}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </div>
        
        {!subscribed && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Free Trial Active</strong> - Choose a subscription plan to continue using all features after your trial ends.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};