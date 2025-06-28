import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardFolderBreadcrumb from '@/components/DashboardFolderBreadcrumb';
import CreateNewButton from '@/components/CreateNewButton';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import CSVImportDialog from '@/components/CSVImportDialog';
import { CSVImportResult } from '@/utils/csvImport';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useRundownFolders } from '@/hooks/useRundownFolders';
import { useTeamId } from '@/hooks/useTeamId';
import { useToast } from '@/hooks/use-toast';
import { useColumnsManager, Column } from '@/hooks/useColumnsManager';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import DashboardRundownGridSkeleton from '@/components/DashboardRundownGridSkeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { teamId } = useTeamId();
  const { savedRundowns, loading, deleteRundown, updateRundown, createRundown, duplicateRundown, loadRundowns } = useRundownStorage();
  const { folders, moveRundownToFolder } = useRundownFolders(teamId || undefined);
  const { toast } = useToast();
  const { handleLoadLayout } = useColumnsManager();
  const isMobile = useIsMobile();
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderType, setFolderType] = useState<'all' | 'recent' | 'archived' | 'custom'>('all');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
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
    // Pass current folder info to the new rundown creation
    const targetFolder = folderType === 'custom' ? selectedFolder : null;
    navigate('/rundown/new', { state: { folderId: targetFolder } });
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

  const handleCSVImport = async (result: CSVImportResult, layoutColumns: Column[]) => {
    try {
      console.log('Dashboard handling CSV import:', { result, layoutColumns });

      if (!result.items || result.items.length === 0) {
        toast({
          title: 'No data to import',
          description: 'The CSV file does not contain any valid rundown data.',
          variant: 'destructive',
        });
        return;
      }

      // Set the columns from the selected layout
      if (layoutColumns && layoutColumns.length > 0) {
        console.log('Setting columns from layout:', layoutColumns);
        handleLoadLayout(layoutColumns);
      }

      // Create a new rundown with the imported data
      const rundownTitle = `Imported Rundown - ${new Date().toLocaleDateString()}`;
      const targetFolder = folderType === 'custom' ? selectedFolder : null;
      const rundownId = await createRundown(rundownTitle, result.items, targetFolder);
      
      toast({
        title: 'Import successful',
        description: `Imported ${result.items.length} items into a new rundown.`,
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

  const handleFolderSelect = (folderId: string | null, folderType: 'all' | 'recent' | 'archived' | 'custom') => {
    setSelectedFolder(folderId);
    setFolderType(folderType);
  };

  const handleRundownDrop = async (rundownId: string, folderId: string | null) => {
    try {
      const success = await moveRundownToFolder(rundownId, folderId);
      
      if (success) {
        // Reload rundowns to get updated data
        await loadRundowns();
        
        toast({
          title: 'Rundown moved',
          description: 'Rundown moved to folder successfully',
        });
      }
    } catch (error) {
      console.error('Error moving rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to move rundown to folder',
        variant: 'destructive',
      });
    }
  };

  // Filter rundowns based on selected folder and search query
  const getFilteredRundowns = () => {
    let baseRundowns = savedRundowns;

    // If searching, filter by search query across all rundowns
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      baseRundowns = savedRundowns.filter(rundown => 
        rundown.title.toLowerCase().includes(query)
      );
      return baseRundowns;
    }

    // Otherwise, filter by folder type as before
    switch (folderType) {
      case 'all':
        return baseRundowns.filter(r => !r.archived);
      case 'recent':
        return baseRundowns.filter(r => {
          const daysDiff = (Date.now() - new Date(r.updated_at).getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7 && !r.archived;
        });
      case 'archived':
        return baseRundowns.filter(r => r.archived);
      case 'custom':
        return baseRundowns.filter(r => r.folder_id === selectedFolder && !r.archived);
      default:
        return baseRundowns.filter(r => !r.archived);
    }
  };

  // Get folder title for display
  const getFolderTitle = () => {
    if (searchQuery.trim()) {
      const resultCount = getFilteredRundowns().length;
      return `Search Results (${resultCount})`;
    }

    switch (folderType) {
      case 'all':
        return 'All Rundowns';
      case 'recent':
        return 'Recently Active';
      case 'archived':
        return 'Archived Rundowns';
      case 'custom':
        const customFolder = folders.find(f => f.id === selectedFolder);
        return customFolder?.name || 'Custom Folder';
      default:
        return 'All Rundowns';
    }
  };

  const filteredRundowns = getFilteredRundowns();
  const folderTitle = getFolderTitle();

  // On mobile, when sidebar is expanded, hide main content
  const showMainContent = !isMobile || sidebarCollapsed;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Full-width Header */}
      <DashboardHeader 
        userEmail={user?.email}
        onSignOut={handleSignOut}
      />
      
      {/* Content area with sidebar and main content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <DashboardSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          rundowns={savedRundowns}
          teamId={teamId || undefined}
          onRundownDrop={handleRundownDrop}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          folderType={folderType}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Content - Hidden on mobile when sidebar is expanded */}
        {showMainContent && (
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0 space-y-6">
                {/* Breadcrumb - Hide when searching */}
                {!searchQuery && (
                  <DashboardFolderBreadcrumb
                    selectedFolder={selectedFolder}
                    folderType={folderType}
                    customFolders={folders}
                  />
                )}
                
                {/* Create New and Import Buttons */}
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
                
                {/* Rundowns Grid or Loading Skeleton */}
                {loading ? (
                  <DashboardRundownGridSkeleton />
                ) : (
                  <DashboardRundownGrid 
                    title={folderTitle}
                    rundowns={filteredRundowns}
                    loading={loading}
                    onOpen={handleOpenRundown}
                    onDelete={handleDeleteRundown}
                    onArchive={handleArchiveRundown}
                    onUnarchive={handleUnarchiveRundown}
                    onDuplicate={handleDuplicateRundown}
                    isArchived={folderType === 'archived'}
                    showEmptyState={true}
                    currentUserId={user?.id}
                  />
                )}
              </div>
            </div>
          </main>
        )}
      </div>

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
