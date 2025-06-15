
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import CreateNewButton from '@/components/CreateNewButton';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { CsvImportDialog } from '@/components/CsvImportDialog';
import { Button } from '@/components/ui/button';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useToast } from '@/hooks/use-toast';
import { useCsvImport } from '@/hooks/useCsvImport';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, deleteRundown, updateRundown } = useRundownStorage();
  const { toast } = useToast();
  const { createRundownFromCsv } = useCsvImport();
  
  // State for delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    rundownId: '',
    title: ''
  });

  // State for CSV import dialog
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  
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

  const handleCsvImport = () => {
    setCsvImportOpen(true);
  };

  const handleCsvImportData = async (data: { items: any[], columns: any[], title: string }) => {
    try {
      await createRundownFromCsv(data);
    } catch (error) {
      // Error handling is done in the hook
    }
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
          {/* Create New and Import Buttons */}
          <div className="flex gap-4">
            <CreateNewButton onClick={handleCreateNew} />
            <Button
              onClick={handleCsvImport}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white border-0"
            >
              <Upload className="h-5 w-5 mr-2" />
              Import CSV
            </Button>
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

      {/* CSV Import Dialog */}
      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImport={handleCsvImportData}
      />
    </div>
  );
};

export default Dashboard;
