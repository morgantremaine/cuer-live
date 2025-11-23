import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardRundownGrid from '@/components/DashboardRundownGrid';
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardFolderBreadcrumb from '@/components/DashboardFolderBreadcrumb';
import CreateNewButton from '@/components/CreateNewButton';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import CSVImportDialog from '@/components/CSVImportDialog';
import { AIRundownDialog } from '@/components/AIRundownDialog';
import CreateTeamDialog from '@/components/CreateTeamDialog';
import { CSVImportResult } from '@/utils/csvImport';
import { RundownItem } from '@/types/rundown';
import { useInvitationHandler } from '@/hooks/useInvitationHandler';
import { useAuth } from '@/hooks/useAuth';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useRundownFolders } from '@/hooks/useRundownFolders';
import { useTeam } from '@/hooks/useTeam';
import { useRundownLimits } from '@/hooks/useRundownLimits';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useAdminTeams } from '@/hooks/useAdminTeams';
import { Column } from '@/types/columns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDashboardRundownOptimized } from '@/hooks/useDashboardRundownOptimized';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import { Plus, Wrench, Calculator, Clock, Timer } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { team, allUserTeams, userRole, switchToTeam, teamMembers, isLoading: teamLoading, error: teamError, loadTeamData, createNewTeam } = useTeam();
  const teamId = team?.id;
  const { savedRundowns, loading, deleteRundown, updateRundown, createRundown, duplicateRundown, duplicateRundownToTeam, loadRundowns } = useRundownStorage();
  const { subscription_tier, access_type } = useSubscription();
  const rundownLimits = useRundownLimits(savedRundowns);
  const { folders, moveRundownToFolder, loading: foldersLoading } = useRundownFolders(teamId || undefined);
  const { toast } = useToast();
  const { adminTeams } = useAdminTeams();
  
  // Enable realtime notifications for connection issues
  useRealtimeNotifications();
  // Remove unused useColumnsManager import since useUserColumnPreferences handles columns now
  const isMobile = useIsMobile();
  
  // Real-time rundown state with local updates
  const [liveRundowns, setLiveRundowns] = useState<SavedRundown[]>([]);
  
  // Update local rundowns when storage changes
  useEffect(() => {
    setLiveRundowns(savedRundowns);
  }, [savedRundowns]);
  
  // Handle real-time rundown updates
  const handleRundownUpdate = (updatedRundown: SavedRundown) => {
    setLiveRundowns(prev => 
      prev.map(r => r.id === updatedRundown.id ? updatedRundown : r)
    );
  };

  // Simple loading state - show skeleton until we have actual rundown data
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);
  
  // Sidebar state - collapsed by default on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderType, setFolderType] = useState<'all' | 'recent' | 'archived' | 'custom'>('recent');
  
  // Only subscribe to real-time updates for non-archived rundowns
  // (unless user is actively viewing the archived folder)
  const rundownsNeedingRealtime = useMemo(() => {
    if (folderType === 'archived') {
      // If viewing archived folder, subscribe to those
      return liveRundowns.filter(r => r.archived);
    }
    // Otherwise, only subscribe to active (non-archived) rundowns
    return liveRundowns.filter(r => !r.archived);
  }, [liveRundowns, folderType]);
  
  // Set up optimized real-time subscriptions for dashboard rundowns
  const { isConnected: realtimeConnected, connectedCount, totalRundowns } = useDashboardRundownOptimized({
    rundowns: rundownsNeedingRealtime,
    onRundownUpdate: handleRundownUpdate,
    enabled: true
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    rundownId: '',
    title: ''
  });
  
  // State for create team dialog
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  
  // Handle any pending team invitations after login
  useInvitationHandler();


  // Mark as loaded once we have the minimum required data
  useEffect(() => {
    // Check if we have the essential data: user and team
    // Don't rely on loading states which can flicker during navigation
    const hasEssentialData = user && team && teamId;
    
    if (hasEssentialData && !initialDataLoaded) {
      // Use a small timeout to prevent flashing when data loads immediately
      const timeoutId = setTimeout(() => {
        console.log('✅ Setting initial data as loaded');
        setInitialDataLoaded(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, team, teamId, initialDataLoaded]);

  // Add timeout protection for team loading state
  useEffect(() => {
    if (teamLoading) {
      const timeout = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 15000); // Show error after 15 seconds

      return () => clearTimeout(timeout);
    } else {
      setShowLoadingTimeout(false);
    }
  }, [teamLoading]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleCreateTeam = async (teamName: string) => {
    setIsCreatingTeam(true);
    try {
      await createNewTeam(teamName);
      setShowCreateTeamDialog(false);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleOpenRundown = (rundownId: string) => {
    navigate(`/rundown/${rundownId}`);
  };

  const handleCreateNew = () => {
    // Check limits before creating
    if (!rundownLimits.canCreateNew) {
      toast({
        title: 'Rundown Limit Reached',
        description: `Free tier users are limited to ${rundownLimits.maxRundowns} rundowns total (active + archived). Please upgrade your plan or delete existing rundowns to create new ones.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Pass current folder info to the new rundown creation
    const targetFolder = folderType === 'custom' ? selectedFolder : null;
    navigate('/rundown/new', { state: { folderId: targetFolder } });
  };

  const handleCreateRundown = async (title: string, items: RundownItem[], timezone: string, startTime: string) => {
    try {
      let folderId: string | null = null;
      if (folderType === 'custom' && selectedFolder) {
        folderId = typeof selectedFolder === 'string' ? selectedFolder : (selectedFolder as any).id;
      }
      const id = await createRundown(title, items, folderId);
      navigate(`/rundown/${id}`);
    } catch (error) {
      console.error('Failed to create AI rundown:', error);
      throw error;
    }
  };

  const handleDisabledCreateClick = () => {
    toast({
      title: 'Upgrade Required',
      description: `You've reached the free tier limit of ${rundownLimits.maxRundowns} rundowns. To unlock unlimited rundowns, upgrade your plan in Account Settings.`,
      variant: 'destructive',
    });
  };

  const handleDisabledImportClick = () => {
    toast({
      title: 'Upgrade Required', 
      description: `You've reached the free tier limit of ${rundownLimits.maxRundowns} rundowns. To unlock unlimited rundowns, upgrade your plan in Account Settings.`,
      variant: 'destructive',
    });
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
      if ((subscription_tier === 'Free' || subscription_tier === null) && (access_type === 'free' || access_type === 'none')) {
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

  const handleDuplicateToTeam = async (
    rundownId: string,
    targetTeamId: string,
    targetTeamName: string,
    title: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      await duplicateRundownToTeam(rundownId, targetTeamId, targetTeamName, title);
      toast({
        title: 'Rundown Duplicated',
        description: `"${title}" has been copied to ${targetTeamName}`,
      });
    } catch (error) {
      console.error('Error duplicating rundown to team:', error);
      toast({
        title: 'Duplication Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
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

      // Check limits before importing
      if (!rundownLimits.canImport) {
        toast({
          title: 'Rundown Limit Reached',
          description: `Free tier users are limited to ${rundownLimits.maxRundowns} rundowns total (active + archived). Please upgrade your plan or delete existing rundowns to import new ones.`,
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

  // Always show main content, let the sidebar width handle the layout
  const showMainContent = true;

  // Show skeleton until we have loaded initial data
  const shouldShowLoadingSkeleton = !initialDataLoaded;

  if (shouldShowLoadingSkeleton) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <DashboardHeader 
          key={team?.id}
          userEmail={user?.email}
          onSignOut={handleSignOut}
          team={team}
          allUserTeams={allUserTeams}
          userRole={userRole}
          switchToTeam={switchToTeam}
          subscriptionTier={subscription_tier}
          onCreateTeam={() => setShowCreateTeamDialog(true)}
        />
        
        {showLoadingTimeout || teamError ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="p-8 text-center max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {teamError || 'Loading is taking longer than expected'}
              </h2>
              <p className="text-muted-foreground mb-6">
                There may be a connection issue. Please try again.
              </p>
              <Button onClick={() => {
                setShowLoadingTimeout(false);
                loadTeamData();
              }}>
                Retry Loading
              </Button>
            </Card>
          </div>
        ) : (
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
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Full-width Header */}
      <DashboardHeader 
        key={team?.id}
        userEmail={user?.email}
        onSignOut={handleSignOut}
        team={team}
        allUserTeams={allUserTeams}
        userRole={userRole}
        switchToTeam={switchToTeam}
        subscriptionTier={subscription_tier}
        onCreateTeam={() => setShowCreateTeamDialog(true)}
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
                <CreateNewButton 
                  onClick={handleCreateNew}
                  disabled={!rundownLimits.canCreateNew}
                  disabledReason={!rundownLimits.canCreateNew ? `Free tier limited to ${rundownLimits.maxRundowns} rundowns total (${rundownLimits.totalCount}/${rundownLimits.maxRundowns}). Upgrade or delete rundowns to continue.` : undefined}
                  onDisabledClick={handleDisabledCreateClick}
                />
                <AIRundownDialog 
                  onCreateRundown={handleCreateRundown}
                  disabled={!rundownLimits.canCreateNew}
                  disabledReason={!rundownLimits.canCreateNew ? `Free tier limited to ${rundownLimits.maxRundowns} rundowns total (${rundownLimits.totalCount}/${rundownLimits.maxRundowns}). Upgrade or delete rundowns to continue.` : undefined}
                />
                {!isMobile && (
                  rundownLimits.canImport ? (
                    <CSVImportDialog onImport={handleCSVImport}>
                      <Button 
                        size="lg" 
                        className="bg-white hover:bg-gray-100 text-black border-0 flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Import CSV
                      </Button>
                    </CSVImportDialog>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={handleDisabledImportClick}
                      className="bg-gray-300 text-gray-600 border-0 flex items-center gap-2 opacity-60 cursor-pointer"
                      title={`Free tier limited to ${rundownLimits.maxRundowns} rundowns total (${rundownLimits.totalCount}/${rundownLimits.maxRundowns}). Upgrade or delete rundowns to continue.`}
                    >
                      <Plus className="h-4 w-4" />
                      Import CSV
                    </Button>
                  )
                )}
                {!isMobile && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="lg"
                        className="bg-gray-700 hover:bg-gray-800 text-white border-0 flex items-center gap-2"
                      >
                        <Wrench className="h-5 w-5 mr-2" />
                        Tools
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover">
                      <DropdownMenuItem 
                        onClick={() => window.open('/tools/script-timing', '_blank', 'noopener,noreferrer')}
                        className="cursor-pointer"
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Script Timing Calculator
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => window.open('/tools/time-calculator', '_blank', 'noopener,noreferrer')}
                        className="cursor-pointer"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Time Calculator
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => window.open('/tools/countdown-clock', '_blank', 'noopener,noreferrer')}
                        className="cursor-pointer"
                      >
                        <Timer className="h-4 w-4 mr-2" />
                        Countdown Clock
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <AdminNotificationSender userEmail={user?.email} />
                 {/* Admin only: Delete test user button */}
                {user?.email === 'morgan@cuer.live' && (
                  <>
                    <Button
                      size="lg"
                      onClick={() => navigate('/admin/health')}
                      variant="outline"
                      className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                    >
                      System Health
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => navigate('/delete-test-user')}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      Delete Test User
                    </Button>
                  </>
                )}
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
                onDuplicateToTeam={handleDuplicateToTeam}
                adminTeams={adminTeams}
                isTeamAdmin={userRole === 'admin'}
                isArchived={folderType === 'archived'}
                folderType={folderType}
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
      
      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={showCreateTeamDialog}
        onOpenChange={setShowCreateTeamDialog}
        onCreateTeam={handleCreateTeam}
        isCreating={isCreatingTeam}
      />
    </div>
  );
};

export default Dashboard;
