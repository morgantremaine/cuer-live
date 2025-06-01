
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useNavigate } from 'react-router-dom'
import DashboardHeader from '@/components/DashboardHeader'
import CreateNewButton from '@/components/CreateNewButton'
import RundownCard from '@/components/RundownCard'
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
  }, [user])

  const handleSignOut = async () => {
    try {
      console.log('Dashboard: Starting sign out process')
      await signOut()
      console.log('Dashboard: Sign out completed, navigating to login')
      navigate('/login')
    } catch (error) {
      console.error('Dashboard: Sign out error, but still navigating to login:', error)
      // Even if signOut fails, navigate to login page
      navigate('/login')
    }
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

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Active Rundowns</h2>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : activeRundowns.length === 0 ? (
            <div className="text-gray-400">No active rundowns found. Create your first rundown to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeRundowns.map((rundown) => (
                <RundownCard
                  key={rundown.id}
                  rundown={rundown}
                  onOpen={handleOpenRundown}
                  onDelete={handleDeleteClick}
                  onArchive={handleArchiveClick}
                  onDuplicate={handleDuplicateClick}
                />
              ))}
            </div>
          )}
        </div>

        {archivedRundowns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Archived Rundowns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedRundowns.map((rundown) => (
                <RundownCard
                  key={rundown.id}
                  rundown={rundown}
                  onOpen={handleOpenRundown}
                  onDelete={handleDeleteClick}
                  onUnarchive={handleUnarchiveClick}
                  onDuplicate={handleDuplicateClick}
                  isArchived={true}
                />
              ))}
            </div>
          </div>
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
