
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, deleteRundown, updateRundown } = useRundownStorage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  
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

  // Filter rundowns based on active tab
  const activeRundowns = savedRundowns.filter(rundown => !rundown.archived);
  const archivedRundowns = savedRundowns.filter(rundown => rundown.archived);
  const currentRundowns = activeTab === 'active' ? activeRundowns : archivedRundowns;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <Button
                  variant={activeTab === 'active' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('active')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'active'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Active Rundowns ({activeRundowns.length})
                </Button>
                <Button
                  variant={activeTab === 'archived' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('archived')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'archived'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  Archived Rundowns ({archivedRundowns.length})
                </Button>
              </nav>
            </div>
          </div>

          {/* Content based on active tab */}
          <DashboardRundownGrid 
            title={activeTab === 'active' ? 'Active Rundowns' : 'Archived Rundowns'}
            rundowns={currentRundowns}
            loading={loading}
            onCreateNew={activeTab === 'active' ? handleCreateNew : undefined}
            onOpen={handleOpenRundown}
            onDelete={handleDeleteRundown}
            onArchive={activeTab === 'active' ? handleArchiveRundown : undefined}
            onUnarchive={activeTab === 'archived' ? handleUnarchiveRundown : undefined}
            onDuplicate={handleDuplicateRundown}
            isArchived={activeTab === 'archived'}
            currentUserId={user?.id}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
