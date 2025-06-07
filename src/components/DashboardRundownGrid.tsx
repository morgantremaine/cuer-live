
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Archive, Users, Plus, RotateCcw, Copy, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SavedRundown } from '@/hooks/useRundownStorage/types'
import { RundownItem } from '@/hooks/useRundownItems'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardRundownGridProps {
  title?: string
  rundowns: SavedRundown[]
  loading: boolean
  onCreateNew?: () => void
  onOpen: (rundownId: string) => void
  onDelete?: (rundownId: string, title: string, e: React.MouseEvent) => void
  onArchive?: (rundownId: string, title: string, e: React.MouseEvent) => void
  onUnarchive?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicate?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  isArchived?: boolean
  showEmptyState?: boolean
  currentUserId?: string
}

const DashboardRundownGrid = ({ 
  title,
  rundowns, 
  loading,
  onCreateNew,
  onOpen,
  onDelete, 
  onArchive,
  onUnarchive,
  onDuplicate,
  isArchived = false,
  showEmptyState = true,
  currentUserId
}: DashboardRundownGridProps) => {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isOwnRundown = (rundown: SavedRundown) => {
    return rundown.user_id === currentUserId
  }

  const getOwnerInfo = (rundown: SavedRundown) => {
    if (isOwnRundown(rundown)) {
      return 'You'
    }
    
    // Show creator's full name if available, otherwise fall back to email or "team member"
    if (rundown.creator_profile?.full_name) {
      return rundown.creator_profile.full_name
    }
    
    if (rundown.creator_profile?.email) {
      return rundown.creator_profile.email
    }
    
    // Fallback to "team member" if no profile data is available
    return 'team member'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {title && <h2 className="text-2xl font-bold text-white">{title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (rundowns.length === 0 && showEmptyState) {
    return (
      <div className="space-y-6">
        {title && <h2 className="text-2xl font-bold text-white">{title}</h2>}
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-300 mb-4">
            {isArchived ? 'No archived rundowns' : 'No rundowns yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {isArchived 
              ? 'You haven\'t archived any rundowns yet.' 
              : 'Create your first rundown to get started with organizing your content.'
            }
          </p>
          {!isArchived && onCreateNew && (
            <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Create New Rundown
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="text-2xl font-bold text-white">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rundowns.map((rundown) => (
          <Card key={rundown.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle 
                    className="text-white text-lg truncate cursor-pointer hover:text-blue-300"
                    onClick={() => onOpen(rundown.id)}
                  >
                    {rundown.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="text-xs">by {getOwnerInfo(rundown)}</span>
                    </div>
                    <span className="text-xs">
                      Updated {formatDate(rundown.updated_at)}
                    </span>
                  </CardDescription>
                </div>
                
                {/* Three-dot menu for actions - now all team members have full permissions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
                    {/* Duplicate - available for all rundowns */}
                    {onDuplicate && (
                      <DropdownMenuItem 
                        onClick={(e) => onDuplicate(rundown.id, rundown.title, rundown.items, e)}
                        className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    
                    {/* Archive/Unarchive - now available for all team members */}
                    {isArchived ? (
                      onUnarchive && (
                        <DropdownMenuItem 
                          onClick={(e) => onUnarchive(rundown.id, rundown.title, rundown.items, e)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Unarchive
                        </DropdownMenuItem>
                      )
                    ) : (
                      onArchive && (
                        <DropdownMenuItem 
                          onClick={(e) => onArchive(rundown.id, rundown.title, e)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )
                    )}
                    
                    {/* Delete - now available for all team members */}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/50 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-800 border-gray-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Delete Rundown</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              Are you sure you want to delete "{rundown.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={(e) => onDelete(rundown.id, rundown.title, e)}
                              className="bg-red-600 hover:bg-red-700 text-white border-0"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {rundown.items?.length || 0} items
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onOpen(rundown.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    Open
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/blueprint/${rundown.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    Blueprint
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DashboardRundownGrid
