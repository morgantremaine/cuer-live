import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '@/components/DashboardHeader'
import CreateNewButton from '@/components/CreateNewButton'
import RundownGrid from '@/components/RundownGrid'
import ConfirmationDialogs from '@/components/ConfirmationDialogs'
import { RundownItem } from '@/hooks/useRundownItems'

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

  // Debug logging
  console.log('Dashboard render - user:', !!user, 'loading:', loading, 'savedRundowns count:', savedRundowns.length)
  console.log('Dashboard render - savedRundowns:', savedRundowns)

  useEffect(() => {
    if (user) {
      console.log('Dashboard useEffect - calling loadRundowns for user:', user.id)
      loadRundowns()
    }
  }, [user, loadRundowns])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleCreateNew = () => {
    navigate('/rundown')
  }

  const handleOpenRundown = (rundownId: string) => {
    navigate(`/rundown/${rundownId}`)
  }

  const handleDeleteClick = (rundownId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteDialog({ open: true, rundownId, title })
  }

  const handleArchiveClick = (rundownId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setArchiveDialog({ open: true, rundownId, title })
  }

  const handleUnarchiveClick = async (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => {
    e.stopPropagation()
    await updateRundown(rundownId, title, items, false, false)
  }

  const handleDuplicateClick = async (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => {
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
  }

  const confirmDelete = async () => {
    if (deleteDialog.rundownId) {
      try {
        await deleteRundown(deleteDialog.rundownId)
        setDeleteDialog({ open: false, rundownId: '', title: '' })
      } catch (error) {
        console.error('Failed to delete rundown:', error)
      }
    }
  }

  const confirmArchive = async () => {
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
  }

  // Fix the filtering logic to handle undefined archived field
  const activeRundowns = savedRundowns.filter(rundown => rundown.archived !== true)
  const archivedRundowns = savedRundowns.filter(rundown => rundown.archived === true)

  console.log('Dashboard render - activeRundowns count:', activeRundowns.length)
  console.log('Dashboard render - activeRundowns:', activeRundowns)
  console.log('Dashboard render - archivedRundowns count:', archivedRundowns.length)

  return (
    <div className="dark min-h-screen bg-gray-900">
      <DashboardHeader userEmail={user?.email} onSignOut={handleSignOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateNewButton onClick={handleCreateNew} />

        <RundownGrid
          title="Active Rundowns"
          rundowns={activeRundowns}
          loading={loading}
          onCreateNew={handleCreateNew}
          onOpen={handleOpenRundown}
          onDelete={handleDeleteClick}
          onArchive={handleArchiveClick}
          onDuplicate={handleDuplicateClick}
          showEmptyState={true}
        />

        {archivedRundowns.length > 0 && (
          <RundownGrid
            title="Archived Rundowns"
            rundowns={archivedRundowns}
            loading={false}
            onOpen={handleOpenRundown}
            onDelete={handleDeleteClick}
            onUnarchive={handleUnarchiveClick}
            onDuplicate={handleDuplicateClick}
            isArchived={true}
            showEmptyState={false}
          />
        )}
      </div>

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
