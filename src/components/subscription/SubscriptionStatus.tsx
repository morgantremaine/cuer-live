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
    grandfathered,
    access_type,
    user_role,
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
          {access_type === 'team_member' 
            ? 'Your access is provided through your team membership'
            : 'Manage your subscription and billing'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Plan:</span>
              {subscribed && subscription_tier ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {subscription_tier}
                  </Badge>
                  {grandfathered && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Grandfathered
                    </Badge>
                  )}
                  {access_type === 'team_member' && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      Team Member
                    </Badge>
                  )}
                </div>
               ) : (
                 <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">No Active Subscription</Badge>
               )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>Up to {max_team_members} team members</span>
            </div>
            
            {access_type === 'team_member' && (
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                ℹ️ Access provided through team admin's subscription
              </div>
            )}

            {access_type === 'personal' && subscribed && subscription_end && !grandfathered && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Next billing: {format(new Date(subscription_end), 'MMM d, yyyy')}
              </div>
            )}

            {grandfathered && access_type === 'personal' && (
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                🎉 Grandfathered - Free {subscription_tier} plan!
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
            
            {/* Only show manage button for personal subscriptions (not team members) */}
            {subscribed && !grandfathered && access_type === 'personal' && (
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
        
        {!subscribed && access_type === 'none' && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-sm text-red-800 dark:text-red-200">
              <strong>Subscription Required</strong> - Choose a subscription plan below to access all Cuer Live features and start creating rundowns.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};