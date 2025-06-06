import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '@/components/DashboardHeader'
import CreateNewButton from '@/components/CreateNewButton'
import DashboardRundownGrid from '@/components/DashboardRundownGrid'
import ConfirmationDialogs from '@/components/ConfirmationDialogs'
import Footer from '@/components/Footer'
import { RundownItem } from '@/hooks/useRundownItems'
import { SavedRundown } from '@/hooks/useRundownStorage/types'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const { savedRundowns, loading, loadRundowns, deleteRundown, updateRundown, saveRundown } = useRundownStorage()
  const navigate = useNavigate()
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rundownId: string; title: string }>({
    open: false,
    rundownId: '',
    title: ''
  })
  const [archiveDialog, setArchiveDialog] = useState<{ open: boolean; rundownId: string; title: string }>({
    open: false,
    rundownId: '',
    title: ''
  })

  // Memoize filtered rundowns to prevent unnecessary recalculations
  const { activeRundowns, archivedRundowns } = useMemo(() => {
    const active = savedRundowns.filter(rundown => !rundown.archived)
    const archived = savedRundowns.filter(rundown => rundown.archived === true)
    return { activeRundowns: active, archivedRundowns: archived }
  }, [savedRundowns])

  // Check if user owns a rundown
  const isOwnRundown = useCallback((rundown: SavedRundown) => {
    return rundown.user_id === user?.id
  }, [user?.id])

  // Load rundowns only once when user is available
  useEffect(() => {
    if (user && !loading && savedRundowns.length === 0) {
      loadRundowns()
    }
  }, [user?.id]) // Only depend on user ID to prevent multiple calls

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Dashboard: Sign out error, but still navigating to login:', error)
      navigate('/login')
    }
  }, [signOut, navigate])

  const handleCreateNew = useCallback(() => {
    navigate('/rundown')
  }, [navigate])

  const handleOpenRundown = useCallback((rundownId: string) => {
    navigate(`/rundown/${rundownId}`)
  }, [navigate])

  const handleDeleteClick = useCallback((rundownId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const rundown = savedRundowns.find(r => r.id === rundownId)
    // Only allow delete if user owns the rundown
    if (rundown && isOwnRundown(rundown)) {
      setDeleteDialog({ open: true, rundownId, title })
    }
  }, [savedRundowns, isOwnRundown])

  const handleArchiveClick = useCallback((rundownId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const rundown = savedRundowns.find(r => r.id === rundownId)
    // Only allow archive if user owns the rundown
    if (rundown && isOwnRundown(rundown)) {
      setArchiveDialog({ open: true, rundownId, title })
    }
  }, [savedRundowns, isOwnRundown])

  const handleUnarchiveClick = useCallback(async (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => {
    e.stopPropagation()
    const rundown = savedRundowns.find(r => r.id === rundownId)
    // Only allow unarchive if user owns the rundown
    if (rundown && isOwnRundown(rundown)) {
      await updateRundown(rundownId, title, items, false, false)
    }
  }, [updateRundown, savedRundowns, isOwnRundown])

  const handleDuplicateClick = useCallback(async (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => {
    e.stopPropagation()
    const rundown = savedRundowns.find(r => r.id === rundownId)
    if (rundown) {
      const newTitle = `COPY ${title}`
      try {
        await saveRundown(newTitle, items, rundown.columns, rundown.timezone)
      } catch (error) {
        console.error('Failed to duplicate rundown:', error)
      }
    }
  }, [savedRundowns, saveRundown])

  const confirmDelete = useCallback(async () => {
    if (deleteDialog.rundownId) {
      try {
        await deleteRundown(deleteDialog.rundownId)
        setDeleteDialog({ open: false, rundownId: '', title: '' })
      } catch (error) {
        console.error('Failed to delete rundown:', error)
      }
    }
  }, [deleteDialog.rundownId, deleteRundown])

  const confirmArchive = useCallback(async () => {
    if (archiveDialog.rundownId) {
      const rundown = savedRundowns.find(r => r.id === archiveDialog.rundownId)
      if (rundown) {
        try {
          await updateRundown(archiveDialog.rundownId, rundown.title, rundown.items, false, true)
          setArchiveDialog({ open: false, rundownId: '', title: '' })
        } catch (error) {
          console.error('Failed to archive rundown:', error)
        }
      }
    }
  }, [archiveDialog.rundownId, savedRundowns, updateRundown])

  return (
    <div className="dark min-h-screen bg-gray-900 flex flex-col">
      <DashboardHeader userEmail={user?.email} onSignOut={handleSignOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <CreateNewButton onClick={handleCreateNew} />

        <DashboardRundownGrid
          title="Active Rundowns"
          rundowns={activeRundowns}
          loading={loading}
          onCreateNew={handleCreateNew}
          onOpen={handleOpenRundown}
          onDelete={handleDeleteClick}
          onArchive={handleArchiveClick}
          onDuplicate={handleDuplicateClick}
          showEmptyState={true}
          // Pass user context to determine permissions
          currentUserId={user?.id}
        />

        {/* Add more spacing between sections */}
        <div className="mt-12">
          <DashboardRundownGrid
            title="Archived Rundowns"
            rundowns={archivedRundowns}
            loading={false}
            onOpen={handleOpenRundown}
            onDelete={handleDeleteClick}
            onUnarchive={handleUnarchiveClick}
            onDuplicate={handleDuplicateClick}
            isArchived={true}
            showEmptyState={true}
            // Pass user context to determine permissions
            currentUserId={user?.id}
          />
        </div>
      </div>

      <Footer />

      <ConfirmationDialogs
        deleteDialog={deleteDialog}
        archiveDialog={archiveDialog}
        onDeleteDialogChange={setDeleteDialog}
        onArchiveDialogChange={setArchiveDialog}
        onConfirmDelete={confirmDelete}
        onConfirmArchive={confirmArchive}
      />
    </div>
  )
}

export default Dashboard
