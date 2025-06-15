import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import CreateNewButton from '@/components/CreateNewButton';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import CSVImportDialog from '@/components/CSVImportDialog';
import { CSVImportResult, validateCSVData } from '@/utils/csvImport';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useToast } from '@/hooks/use-toast';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, deleteRundown, updateRundown, createRundown } = useRundownStorage();
  const { toast } = useToast();
  const { columns, handleAddColumn } = useColumnsManager();
  
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
    // For now, just show a toast that this feature is coming soon
    toast({
      title: 'Coming Soon',
      description: 'Duplicate rundown feature will be available soon.',
    });
  };

  const handleCSVImport = async (result: CSVImportResult) => {
    try {
      console.log('Dashboard handling CSV import:', result);

      if (!result.items || result.items.length === 0) {
        toast({
          title: 'No data to import',
          description: 'The CSV file does not contain any valid rundown data.',
          variant: 'destructive',
        });
        return;
      }

      // Add any new columns to the column manager first
      if (result.newColumns && result.newColumns.length > 0) {
        console.log('Adding new columns to column manager:', result.newColumns);
        result.newColumns.forEach(newColumn => {
          handleAddColumn(newColumn.name);
        });
      }

      // Create a new rundown with the imported data
      const rundownTitle = `Imported Rundown - ${new Date().toLocaleDateString()}`;
      const rundownId = await createRundown(rundownTitle, result.items);
      
      toast({
        title: 'Import successful',
        description: `Imported ${result.items.length} items into a new rundown${result.newColumns?.length ? ` with ${result.newColumns.length} new columns` : ''}.`,
      });

      // Navigate to the new rundown
      navigate(`/rundown/${rundownId}`);
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Import failed',
        description: 'There was an error importing the CSV file. Please try again.',
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
            <CSVImportDialog onImport={handleCSVImport} existingColumns={columns}>
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
