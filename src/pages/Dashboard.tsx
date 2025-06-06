
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import TeamManagement from '@/components/TeamManagement';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, deleteRundown, updateRundown } = useRundownStorage();
  const { team, userRole } = useTeam();
  const { toast } = useToast();
  
  // Handle any pending team invitations after login
  useInvitationHandler();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleOpenRundown = (rundownId: string) => {
    navigate(`/rundown/${rundownId}`);
  };

  const handleCreateNew = () => {
    navigate('/rundown/new');
  };

  const handleDeleteRundown = async (rundownId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteRundown(rundownId);
    } catch (error) {
      console.error('Error deleting rundown:', error);
    }
  };

  const handleArchiveRundown = async (rundownId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rundown = savedRundowns.find(r => r.id === rundownId);
    if (rundown) {
      try {
        await updateRundown(rundownId, title, rundown.items, false, true);
      } catch (error) {
        console.error('Error archiving rundown:', error);
      }
    }
  };

  const handleUnarchiveRundown = async (rundownId: string, title: string, items: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateRundown(rundownId, title, items, false, false);
    } catch (error) {
      console.error('Error unarchiving rundown:', error);
    }
  };

  const handleDuplicateRundown = async (rundownId: string, title: string, items: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    // For now, just show a toast that this feature is coming soon
    toast({
      title: 'Coming Soon',
      description: 'Duplicate rundown feature will be available soon.',
    });
  };

  // Filter rundowns into active and archived
  const activeRundowns = savedRundowns.filter(rundown => !rundown.archived);
  const archivedRundowns = savedRundowns.filter(rundown => rundown.archived);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          {/* Team Management Section */}
          {team && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Team: {team.name}
              </h2>
              <TeamManagement />
            </div>
          )}

          {/* Active Rundowns Section */}
          <DashboardRundownGrid 
            title="Active Rundowns"
            rundowns={activeRundowns}
            loading={loading}
            onCreateNew={handleCreateNew}
            onOpen={handleOpenRundown}
            onDelete={handleDeleteRundown}
            onArchive={handleArchiveRundown}
            onDuplicate={handleDuplicateRundown}
            isArchived={false}
            showEmptyState={true}
            currentUserId={user?.id}
          />

          {/* Archived Rundowns Section */}
          {archivedRundowns.length > 0 && (
            <DashboardRundownGrid 
              title="Archived Rundowns"
              rundowns={archivedRundowns}
              loading={loading}
              onOpen={handleOpenRundown}
              onDelete={handleDeleteRundown}
              onUnarchive={handleUnarchiveRundown}
              onDuplicate={handleDuplicateRundown}
              isArchived={true}
              showEmptyState={false}
              currentUserId={user?.id}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
