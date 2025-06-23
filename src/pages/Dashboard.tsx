
import DashboardHeader from '@/components/DashboardHeader';
import RundownCard from '@/components/RundownCard';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InvitationRecovery from '@/components/InvitationRecovery';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { savedRundowns, loadRundowns, createRundown, deleteRundown, updateRundown, loading: loadingRundowns } = useRundownStorage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadRundowns();
    }
  }, [user, loadRundowns]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <DashboardHeader 
        userEmail={user.email}
        onSignOut={signOut}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Add invitation recovery component at the top */}
        <div className="mb-6">
          <InvitationRecovery />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedRundowns?.map((rundown) => (
            <RundownCard
              key={rundown.id}
              rundown={rundown}
              onDelete={deleteRundown}
              onUpdate={updateRundown}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
