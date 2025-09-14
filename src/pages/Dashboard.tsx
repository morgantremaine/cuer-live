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
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { Column } from '@/types/columns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboardRundownOptimized } from '@/hooks/useDashboardRundownOptimized';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import { Plus } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { team, teamMembers, isLoading: teamLoading } = useTeam();
  const teamId = team?.id;
  const { savedRundowns, loading, deleteRundown, updateRundown, createRundown, duplicateRundown, loadRundowns } = useRundownStorage();
  const { subscription_tier, access_type } = useSubscription();
  const { folders, moveRundownToFolder } = useRundownFolders(teamId || undefined);
  const { toast } = useToast();
  // Remove unused useColumnsManager import since useUserColumnPreferences handles columns now
  const isMobile = useIsMobile();
  
  // Real-time rundown state with local updates
  const [liveRundowns, setLiveRundowns] = useState<SavedRundown[]>([]);
  const [hasLoadedRundowns, setHasLoadedRundowns] = useState(false);
  
  // Update local rundowns when storage changes
  useEffect(() => {
    console.log('📊 Rundowns updated:', savedRundowns.length, 'loading:', loading);
    setLiveRundowns(savedRundowns);
    
    // Mark as loaded when we get data (even if empty) AND loading is complete
    if (!loading && !hasLoadedRundowns) {
      console.log('✅ Rundowns loading completed - data ready');
      setHasLoadedRundowns(true);
    }
  }, [savedRundowns, loading, hasLoadedRundowns]);
  
  // Handle real-time rundown updates
  const handleRundownUpdate = (updatedRundown: SavedRundown) => {
    setLiveRundowns(prev => 
      prev.map(r => r.id === updatedRundown.id ? updatedRundown : r)
    );
  };
  
  // Set up optimized real-time subscriptions for dashboard rundowns
  const { isConnected: realtimeConnected, connectedCount, totalRundowns } = useDashboardRundownOptimized({
    rundowns: liveRundowns,
    onRundownUpdate: handleRundownUpdate,
    enabled: true
  });

  // Log connection status for debugging
  useEffect(() => {
    if (totalRundowns > 0) {
      console.log('🎯 Dashboard: Realtime status:', { 
        connected: realtimeConnected, 
        connectedCount, 
        totalRundowns 
      });
    }
  }, [realtimeConnected, connectedCount, totalRundowns]);
  
  // Improved loading state tracking
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderType, setFolderType] = useState<'all' | 'recent' | 'archived' | 'custom'>('recent');
  
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

  // Track when data has been loaded for the first time - FIXED VERSION
  useEffect(() => {
    const userReady = !!user;
    const teamReady = !!teamId && !teamLoading;
    const rundownsReady = hasLoadedRundowns; // Use our specific flag
    
    console.log('🔍 FIXED Dashboard check:', {
      userReady,
      teamReady, 
      rundownsReady,
      hasLoadedRundowns,
      loading,
      teamLoading,
      teamId: !!teamId,
      savedRundownsLength: savedRundowns.length,
      hasInitiallyLoaded
    });
    
    if (userReady && teamReady && rundownsReady && !hasInitiallyLoaded) {
      console.log('✅ FIXED: All conditions met - showing dashboard');
      setHasInitiallyLoaded(true);
    }
  }, [user, teamId, teamLoading, hasLoadedRundowns, hasInitiallyLoaded, savedRundowns.length]);

  // Reset loading state when user changes
  useEffect(() => {
    if (user?.id) {
      setHasInitiallyLoaded(false);
      setHasLoadedRundowns(false);
    }
  }, [user?.id]);

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
      // Check rundown limits for free tier users when unarchiving
      if (subscription_tier === 'Free' && access_type === 'free') {
        const activeRundowns = savedRundowns.filter(r => !r.archived);
        if (activeRundowns.length >= 3) {
          toast({
            title: 'Rundown Limit Reached',
            description: 'Free tier users are limited to 3 active rundowns. Please upgrade your plan or archive other rundowns first.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      await updateRundown(rundownId, title, items, false, false);
      toast({
        title: 'Success',
        description: 'Rundown unarchived successfully.',
      });
    } catch (error) {
      console.error('Error unarchiving rundown:', error);
      toast({
        title: 'Error',
        description: 'Failed to unarchive rundown.',
        variant: 'destructive',
      });
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

      // Column layout handling moved to useUserColumnPreferences - no longer needed
      // if (layoutColumns && layoutColumns.length > 0) {
      //   console.log('Setting columns from layout:', layoutColumns);
      //   // handleLoadLayout removed - handled by useUserColumnPreferences
      // }

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
    let baseRundowns = liveRundowns; // Use live rundowns for real-time updates

    // If searching, filter by search query across all rundowns
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      baseRundowns = liveRundowns.filter(rundown => 
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
        return 'Recent';
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

  // Show skeleton until we have definitively loaded rundown data
  const shouldShowLoadingSkeleton = !hasInitiallyLoaded;
  
  console.log('🔍 FINAL Dashboard render check:', {
    shouldShowLoadingSkeleton,
    hasInitiallyLoaded,
    hasLoadedRundowns,
    loading,
    teamLoading,
    savedRundownsCount: savedRundowns.length,
    liveRundownsCount: liveRundowns.length
  });

  if (shouldShowLoadingSkeleton) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <DashboardHeader 
          userEmail={user?.email}
          onSignOut={handleSignOut}
        />
        
        <div className="flex flex-1">
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-4">
            <div className="space-y-4">
              <Skeleton className="h-8 w-full bg-gray-700" />
              <Skeleton className="h-6 w-3/4 bg-gray-700" />
              <Skeleton className="h-6 w-1/2 bg-gray-700" />
               <Skeleton className="h-6 w-2/3 bg-gray-700" />
            </div>
          </div>
          
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              <div className="px-4 py-6 sm:px-0 space-y-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-40 bg-gray-700" />
                  <Skeleton className="h-12 w-32 bg-gray-700" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-32 w-full bg-gray-700" />
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
          rundowns={liveRundowns} // Use live rundowns for real-time updates
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
            <div className="container mx-auto px-4 py-8">
              {/* Action buttons */}
              <div className="flex gap-4 mb-6 flex-wrap">
                <CreateNewButton onClick={handleCreateNew} />
                <CSVImportDialog onImport={handleCSVImport}>
                  <Button size="lg" className="bg-white hover:bg-gray-100 text-black border-0 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Import CSV
                  </Button>
                </CSVImportDialog>
                <AdminNotificationSender userEmail={user?.email} />
              </div>

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
                teamMembers={teamMembers}
              />
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
