import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

const Subscription = () => {
  const { user, signOut } = useAuth();
  const { access_type } = useSubscription();
  const navigate = useNavigate();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="dark min-h-screen bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email} 
        onSignOut={handleSignOut}
        showBackButton={true}
        onBack={handleBackToDashboard}
      />
      
      <div className="space-y-8 pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              {access_type === 'team_member' ? 'Team Subscription' : 'Choose Your Plan'}
            </h1>
            <p className="text-gray-400 mt-2">
              {access_type === 'team_member' 
                ? 'Your access is provided through your team membership'
                : 'Select a subscription plan to access all Cuer Live features'
              }
            </p>
          </div>
          
          <SubscriptionStatus />
        </div>
        
        {/* Only show subscription plans for users without team access */}
        {access_type !== 'team_member' && (
          <SubscriptionPlans 
            interval={interval}
            onIntervalChange={setInterval}
          />
        )}
      </div>
    </div>
  );
};

export default Subscription;