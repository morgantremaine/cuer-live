
import DashboardHeader from '@/components/DashboardHeader';
import RundownCard from '@/components/RundownCard';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InvitationRecovery from '@/components/InvitationRecovery';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { savedRundowns, loadRundowns, createRundown, deleteRundown, updateRundown, duplicateRundown, archiveRundown, loading: loadingRundowns } = useRundownStorage();
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

  const handleOpenRundown = (id: string) => {
    navigate(`/rundown/${id}`);
  };

  const handleDeleteRundown = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteRundown(id);
    }
  };

  const handleArchiveRundown = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive "${title}"?`)) {
      await archiveRundown(id);
    }
  };

  const handleUnarchiveRundown = async (id: string, title: string, items: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    // Implement unarchive logic if needed
    console.log('Unarchive not implemented yet');
  };

  const handleDuplicateRundown = async (id: string, title: string, items: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (duplicateRundown) {
      await duplicateRundown(id);
    }
  };

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
              onOpen={handleOpenRundown}
              onDelete={handleDeleteRundown}
              onArchive={handleArchiveRundown}
              onUnarchive={handleUnarchiveRundown}
              onDuplicate={handleDuplicateRundown}
              isArchived={rundown.archived}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
