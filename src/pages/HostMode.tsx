import React from 'react';
import LocalHostMode from '@/components/LocalHostMode';
import DashboardHeader from '@/components/DashboardHeader';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const HostMode = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardHeader 
        showBackButton={true}
        onBack={() => navigate('/dashboard')}
        onSignOut={handleSignOut}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Local Host Mode</h1>
          <p className="text-gray-400 mt-2">
            Turn this device into a local collaboration server for your team
          </p>
        </div>

        <LocalHostMode />
      </div>
    </div>
  );
};

export default HostMode;