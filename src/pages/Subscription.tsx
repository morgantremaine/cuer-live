import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';

const Subscription = () => {
  const { user, signOut } = useAuth();
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Subscription Plans</h1>
          <p className="text-gray-400 mt-2">Choose the perfect plan for your team</p>
        </div>

        <div className="space-y-8">
          <SubscriptionStatus />
          
          <SubscriptionPlans 
            interval={interval}
            onIntervalChange={setInterval}
          />
        </div>
      </div>
    </div>
  );
};

export default Subscription;