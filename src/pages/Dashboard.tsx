import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import CreateNewButton from '@/components/CreateNewButton';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import CSVImportDialog from '@/components/CSVImportDialog';
import { CSVImportResult } from '@/utils/csvImport';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useToast } from '@/hooks/use-toast';
import { useColumnsManager, Column } from '@/hooks/useColumnsManager';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, deleteRundown, updateRundown, createRundown, duplicateRundown } = useRundownStorage();
  const { toast } = useToast();
  const { handleLoadLayout } = useColumnsManager();
  
  // State for delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    rundownId: '',
    title: ''
  });
  
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
    setDeleteDialog({
      open: true,
      rundownId,
      title
    });
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteRundown(deleteDialog.rundownId);
      toast({
        title: 'Rundown deleted',
        description: `"${deleteDialog.title}" has been permanently deleted.`,
      });
    } catch (error) {
      console.error('Error deleting rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete rundown. Please try again.',
        variant: 'destructive',
      });
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
    try {
      const rundown = savedRundowns.find(r => r.id === rundownId);
      if (!rundown) {
        toast({
          title: 'Error',
          description: 'Rundown not found.',
          variant: 'destructive',
        });
        return;
      }

      const newRundownId = await duplicateRundown(rundown);
      toast({
        title: 'Rundown duplicated',
        description: `"${rundown.title}" has been duplicated successfully.`,
      });
      
      // Navigate to the duplicated rundown
      navigate(`/rundown/${newRundownId}`);
    } catch (error) {
      console.error('Error duplicating rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate rundown. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Filter rundowns - now show ALL team rundowns regardless of who created them
  const activeRundowns = savedRundowns.filter(rundown => !rundown.archived);
  const archivedRundowns = savedRundowns.filter(rundown => rundown.archived);

  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-12">
          {/* Create New and Import Buttons - Fixed alignment */}
          <div className="flex items-center space-x-4">
            <CreateNewButton onClick={handleCreateNew} />
            <CSVImportDialog onImport={handleCSVImport}>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                Import CSV
              </Button>
            </CSVImportDialog>
          </div>
          
          {/* Active Rundowns Section */}
          <DashboardRundownGrid 
            title="Active Rundowns"
            rundowns={activeRundowns}
            loading={loading}
            onOpen={handleOpenRundown}
            onDelete={handleDeleteRundown}
            onArchive={handleArchiveRundown}
            onDuplicate={handleDuplicateRundown}
            isArchived={false}
            currentUserId={user?.id}
          />

          {/* Archived Rundowns Section - now shows ALL archived rundowns from teams */}
          {archivedRundowns.length > 0 && (
            <DashboardRundownGrid 
              title="Archived Rundowns"
              rundowns={archivedRundowns}
              loading={false}
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        rundownTitle={deleteDialog.title}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Dashboard;
