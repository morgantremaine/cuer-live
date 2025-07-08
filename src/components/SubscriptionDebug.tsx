import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SubscriptionDebug = () => {
  const { user } = useAuth();
  const subscription = useSubscription();

  const handleTestCheckout = () => {
    subscription.createCheckout('Producer', 'monthly');
  };

  const handleRefresh = () => {
    subscription.checkSubscription();
  };

  const handlePortal = () => {
    subscription.openCustomerPortal();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Subscription Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">User Info:</h3>
          <p>User ID: {user?.id}</p>
          <p>Email: {user?.email}</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Subscription Status:</h3>
          <p>Loading: {subscription.loading ? 'Yes' : 'No'}</p>
          <p>Subscribed: {subscription.subscribed ? 'Yes' : 'No'}</p>
          <p>Access Type: {subscription.access_type}</p>
          <p>Tier: {subscription.subscription_tier || 'None'}</p>
          <p>Max Team Members: {subscription.max_team_members}</p>
          <p>Grandfathered: {subscription.grandfathered ? 'Yes' : 'No'}</p>
          <p>User Role: {subscription.user_role || 'None'}</p>
          <p>Error: {subscription.error || 'None'}</p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Test Actions:</h3>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleRefresh} variant="outline">
              Refresh Status
            </Button>
            <Button onClick={handleTestCheckout} variant="default">
              Test Checkout (Producer)
            </Button>
            {subscription.subscribed && (
              <Button onClick={handlePortal} variant="secondary">
                Open Portal
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Expected Behavior:</h3>
          <ul className="text-sm space-y-1">
            <li>• New users should see access_type: 'none' and be redirected to subscription page</li>
            <li>• Team members should see access_type: 'team_member' and have access</li>
            <li>• Paid users should see access_type: 'personal' and have access</li>
            <li>• Checkout should open Stripe in new tab</li>
            <li>• After payment, user should have access without team membership</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};