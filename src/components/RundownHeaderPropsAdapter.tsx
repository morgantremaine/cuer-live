
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { useAuth } from '@/hooks/useAuth';

const RundownHeaderPropsAdapter = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { id } = useParams();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // Show back button when we're on a specific rundown page (has an ID)
  const showBackButton = !!id && id !== 'new';

  return (
    <DashboardHeader 
      userEmail={user?.email}
      onSignOut={handleSignOut}
      showBackButton={showBackButton}
      onBack={handleBack}
    />
  );
};

export default RundownHeaderPropsAdapter;
