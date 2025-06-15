import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import CreateNewButton from '@/components/CreateNewButton';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { importFromCSV } from '@/utils/csvUtils';
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading, deleteRundown, updateRundown, createRundown } = useRundownStorage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'text/csv') {
      if (file) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV file',
          variant: 'destructive'
        });
      }
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvContent = e.target?.result as string;
          const { items: importedItems, newColumns, errors } = importFromCSV(csvContent, []);
          
          if (errors.length > 0) {
            toast({
              title: 'Import warnings',
              description: errors.join('; '),
              variant: 'destructive'
            });
          }
          
          if (importedItems.length === 0) {
            toast({
              title: 'Import failed',
              description: 'No valid data found in the CSV file',
              variant: 'destructive'
            });
            return;
          }

          // Create a new rundown from the imported data
          const filename = file.name.replace('.csv', '');
          const rundownTitle = `Imported: ${filename}`;
          const rundownId = uuidv4();
          
          await createRundown(rundownId, rundownTitle, importedItems);
          
          toast({
            title: 'Import successful',
            description: `Created new rundown "${rundownTitle}" with ${importedItems.length} items`
          });
          
          // Navigate to the new rundown
          navigate(`/rundown/${rundownId}`);
          
        } catch (error) {
          console.error('Import error:', error);
          toast({
            title: 'Import failed',
            description: error instanceof Error ? error.message : 'Failed to parse CSV file',
            variant: 'destructive'
          });
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to read the file',
        variant: 'destructive'
      });
    }

    // Reset the input
    event.target.value = '';
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
          {/* Create New and Import Section */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <CreateNewButton onClick={handleCreateNew} />
            <Button 
              onClick={handleImportCSV} 
              variant="outline" 
              className="flex items-center space-x-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              <Upload className="h-4 w-4" />
              <span>Import CSV</span>
            </Button>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
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
