
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, LogOut, Calendar, Clock, Trash2, Archive, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const { savedRundowns, loading, loadRundowns, deleteRundown, updateRundown } = useRundownStorage()
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

  useEffect(() => {
    if (user) {
      loadRundowns()
    }
  }, [user])

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

  const confirmDelete = async () => {
    if (deleteDialog.rundownId) {
      await deleteRundown(deleteDialog.rundownId)
      setDeleteDialog({ open: false, rundownId: '', title: '' })
    }
  }

  const confirmArchive = async () => {
    if (archiveDialog.rundownId) {
      const rundown = savedRundowns.find(r => r.id === archiveDialog.rundownId)
      if (rundown) {
        // Archive the rundown by setting archived to true
        await updateRundown(archiveDialog.rundownId, rundown.title, rundown.items, false, true)
      }
      setArchiveDialog({ open: false, rundownId: '', title: '' })
    }
  }

  // Filter rundowns to show only non-archived ones
  const activeRundowns = savedRundowns.filter(rundown => !rundown.archived)
  const archivedRundowns = savedRundowns.filter(rundown => rundown.archived)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Cuer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New Button */}
        <div className="mb-8">
          <Button onClick={handleCreateNew} size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" />
            Create New Rundown
          </Button>
        </div>

        {/* Active Rundowns Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Rundowns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : activeRundowns.length === 0 ? (
              // Empty state
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rundowns yet</h3>
                <p className="text-gray-600 mb-4">Create your first rundown to get started</p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Rundown
                </Button>
              </div>
            ) : (
              // Active rundowns list
              activeRundowns.map((rundown) => (
                <Card key={rundown.id} className="hover:shadow-lg transition-shadow cursor-pointer relative" onClick={() => handleOpenRundown(rundown.id)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{rundown.title}</CardTitle>
                        <CardDescription className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(rundown.updated_at), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleArchiveClick(rundown.id, rundown.title, e)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteClick(rundown.id, rundown.title, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {rundown.items?.length || 0} items
                      </div>
                      <Button variant="ghost" size="sm">
                        Open →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Archived Rundowns Section */}
        {archivedRundowns.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Archived Rundowns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedRundowns.map((rundown) => (
                <Card key={rundown.id} className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 relative" onClick={() => handleOpenRundown(rundown.id)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          <Archive className="h-4 w-4 mr-2 text-gray-500" />
                          {rundown.title}
                        </CardTitle>
                        <CardDescription className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {format(new Date(rundown.updated_at), 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={async (e) => {
                              e.stopPropagation()
                              await updateRundown(rundown.id, rundown.title, rundown.items, false, false)
                            }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteClick(rundown.id, rundown.title, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {rundown.items?.length || 0} items
                      </div>
                      <Button variant="ghost" size="sm">
                        Open →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rundown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deleteDialog.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialog.open} onOpenChange={(open) => setArchiveDialog({ ...archiveDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Rundown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archiveDialog.title}"? You can still access it in the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Dashboard
