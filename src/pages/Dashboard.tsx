
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useRundownStorage } from '@/hooks/useRundownStorage'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, LogOut, Calendar, Clock, Archive, Trash2, MoreHorizontal, Undo2 } from 'lucide-react'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

const Dashboard = () => {
  const { user, signOut } = useAuth()
  const { activeRundowns, archivedRundowns, loading, loadRundowns, deleteRundown, archiveRundown, unarchiveRundown } = useRundownStorage()
  const navigate = useNavigate()
  const [showArchived, setShowArchived] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedRundownId, setSelectedRundownId] = useState<string>('')
  const [selectedRundownTitle, setSelectedRundownTitle] = useState<string>('')

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

  const handleArchiveClick = (rundownId: string, title: string) => {
    setSelectedRundownId(rundownId)
    setSelectedRundownTitle(title)
    setArchiveDialogOpen(true)
  }

  const handleDeleteClick = (rundownId: string, title: string) => {
    setSelectedRundownId(rundownId)
    setSelectedRundownTitle(title)
    setDeleteDialogOpen(true)
  }

  const handleConfirmArchive = () => {
    archiveRundown(selectedRundownId)
    setArchiveDialogOpen(false)
    setSelectedRundownId('')
    setSelectedRundownTitle('')
  }

  const handleConfirmDelete = () => {
    deleteRundown(selectedRundownId)
    setDeleteDialogOpen(false)
    setSelectedRundownId('')
    setSelectedRundownTitle('')
  }

  const handleUnarchive = (rundownId: string) => {
    unarchiveRundown(rundownId)
  }

  const displayedRundowns = showArchived ? archivedRundowns : activeRundowns

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
        {/* Header with Toggle */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={handleCreateNew} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Create New Rundown
            </Button>
            <Button 
              variant={showArchived ? "default" : "outline"} 
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Active Rundowns
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archived ({archivedRundowns.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rundowns Grid */}
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
          ) : displayedRundowns.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              {showArchived ? <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" /> : <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showArchived ? 'No archived rundowns' : 'No rundowns yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {showArchived ? 'Archived rundowns will appear here' : 'Create your first rundown to get started'}
              </p>
              {!showArchived && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Rundown
                </Button>
              )}
            </div>
          ) : (
            // Rundowns list
            displayedRundowns.map((rundown) => (
              <Card key={rundown.id} className="hover:shadow-lg transition-shadow relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => handleOpenRundown(rundown.id)}>
                      <CardTitle className="text-lg">{rundown.title}</CardTitle>
                      <CardDescription className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(rundown.updated_at), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {showArchived ? (
                          <DropdownMenuItem onClick={() => handleUnarchive(rundown.id)}>
                            <Undo2 className="h-4 w-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleArchiveClick(rundown.id, rundown.title)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(rundown.id, rundown.title)}
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
                    <Button variant="ghost" size="sm" onClick={() => handleOpenRundown(rundown.id)}>
                      Open →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Rundown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{selectedRundownTitle}"? You can unarchive it later from the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rundown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{selectedRundownTitle}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Dashboard
