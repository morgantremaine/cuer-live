import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Archive, Users, Plus, RotateCcw, Copy, MoreVertical, Clock, FileText, Play, Calendar } from 'lucide-react'
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

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

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
  teamMembers?: TeamMember[]
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
  currentUserId,
  teamMembers = []
}: DashboardRundownGridProps) => {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isOwnRundown = (rundown: SavedRundown) => {
    return rundown.user_id === currentUserId
  }

  const getOwnerInfo = (rundown: SavedRundown) => {
    if (isOwnRundown(rundown)) {
      return 'You'
    }
    
    // First try to find the team member by user_id
    const teamMember = teamMembers.find(member => member.user_id === rundown.user_id);
    if (teamMember?.profiles?.full_name) {
      return teamMember.profiles.full_name;
    }
    if (teamMember?.profiles?.email) {
      return teamMember.profiles.email;
    }
    
    // Fallback to creator_profile if available
    if (rundown.creator_profile?.full_name) {
      return rundown.creator_profile.full_name
    }
    
    if (rundown.creator_profile?.email) {
      return rundown.creator_profile.email
    }
    
    return 'Unknown User'
  }

  const calculateTotalDuration = (items: RundownItem[]) => {
    const totalSeconds = items.reduce((total, item) => {
      if (item.duration && item.type !== 'header') {
        const [minutes, seconds] = item.duration.split(':').map(Number)
        return total + (minutes * 60) + seconds
      }
      return total
    }, 0)
    
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    // If total duration is over an hour, show hours:minutes:seconds format
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    
    // Otherwise, show minutes:seconds format
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getRundownPreview = (items: RundownItem[]) => {
    const contentItems = items.filter(item => item.type !== 'header')
    const headers = items.filter(item => item.type === 'header')
    
    return {
      segmentCount: headers.length,
      itemCount: contentItems.length,
      totalDuration: calculateTotalDuration(items),
      firstItems: headers.slice(0, 3).map(header => {
        if (header.name && header.name.trim()) return header.name.trim()
        if (header.script && header.script.trim()) return header.script.trim().substring(0, 40) + (header.script.trim().length > 40 ? '...' : '')
        if (header.notes && header.notes.trim()) return header.notes.trim()
        return 'Untitled Header'
      })
    }
  }

  const getActivityStatus = (rundown: SavedRundown) => {
    const updatedDate = new Date(rundown.updated_at)
    const now = new Date()
    const hoursDiff = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff < 1) return { status: 'active', color: 'bg-green-500', label: 'Recently Active' }
    if (hoursDiff < 24) return { status: 'recent', color: 'bg-yellow-500', label: 'Updated Today' }
    if (hoursDiff < 168) return { status: 'week', color: 'bg-blue-500', label: 'This Week' }
    return { status: 'older', color: 'bg-gray-500', label: 'Older' }
  }

  // Handle drag start for rundown cards
  const handleDragStart = (e: React.DragEvent, rundownId: string) => {
    e.dataTransfer.setData('text/rundown-id', rundownId);
    e.dataTransfer.effectAllowed = 'move';
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {title && <h2 className="text-2xl font-bold text-white">{title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-800 rounded-lg animate-pulse" />
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
        {rundowns.map((rundown) => {
          const preview = getRundownPreview(rundown.items || [])
          const activity = getActivityStatus(rundown)
          
          // Compact card for archived rundowns
          if (isArchived) {
            return (
              <Card 
                key={rundown.id} 
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden cursor-move"
                draggable
                onDragStart={(e) => handleDragStart(e, rundown.id)}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${activity.color} opacity-50`} />
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle 
                        className="text-white text-base cursor-pointer hover:text-blue-300 transition-colors leading-tight break-words"
                        onClick={() => onOpen(rundown.id)}
                      >
                        {rundown.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400 flex items-center gap-2 text-xs mt-1">
                        <span>{getOwnerInfo(rundown)}</span>
                        <span>•</span>
                        <span>{formatDate(rundown.updated_at)}</span>
                      </CardDescription>
                    </div>
                    
                    {/* Three-dot menu - Fixed: Remove invalid React.Fragment props */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
                        {onUnarchive && (
                          <DropdownMenuItem 
                            onClick={(e) => onUnarchive(rundown.id, rundown.title, rundown.items, e)}
                            className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                        )}
                        
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
                
                <CardContent className="pt-0 space-y-3">
                  {/* Compact Stats */}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{preview.segmentCount} headers</span>
                    <span>{preview.itemCount} segments</span>
                    <span>{preview.totalDuration}</span>
                  </div>

                  {/* Simple Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onOpen(rundown.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          }

          // Full card for active rundowns
          return (
            <Card 
              key={rundown.id} 
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 group relative overflow-hidden cursor-move"
              draggable
              onDragStart={(e) => handleDragStart(e, rundown.id)}
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${activity.color}`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-start gap-2 mb-1">
                      <CardTitle 
                        className="text-white text-lg cursor-pointer hover:text-blue-300 transition-colors leading-tight break-words flex-1"
                        onClick={() => onOpen(rundown.id)}
                      >
                        {rundown.title}
                      </CardTitle>
                    </div>
                    
                    <CardDescription className="text-gray-400 flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>by {getOwnerInfo(rundown)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(rundown.updated_at)}</span>
                      </div>
                    </CardDescription>
                  </div>
                  
                  {/* Three-dot menu - Fixed: Remove invalid React.Fragment props */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
                      {onDuplicate && (
                        <DropdownMenuItem 
                          onClick={(e) => onDuplicate(rundown.id, rundown.title, rundown.items, e)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                      )}
                      
                      {onArchive && (
                        <DropdownMenuItem 
                          onClick={(e) => onArchive(rundown.id, rundown.title, e)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      
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
              
              <CardContent className="pt-0 space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-blue-400 text-sm font-medium">{preview.segmentCount}</div>
                    <div className="text-gray-400 text-xs">Headers</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-green-400 text-sm font-medium">{preview.itemCount}</div>
                    <div className="text-gray-400 text-xs">Segments</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <div className="text-purple-400 text-sm font-medium flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {preview.totalDuration}
                    </div>
                    <div className="text-gray-400 text-xs">Duration</div>
                  </div>
                </div>

                {/* Content Preview - Condensed */}
                {preview.firstItems.length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-2">
                    <div className="space-y-0.5">
                      {preview.firstItems.map((item, index) => (
                        <div key={index} className="text-gray-400 text-xs truncate">
                          • {item}
                        </div>
                      ))}
                      {preview.segmentCount > 3 && (
                        <div className="text-gray-500 text-xs">
                          +{preview.segmentCount - 3} more headers...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onOpen(rundown.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all hover:scale-105"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/blueprint/${rundown.id}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all hover:scale-105"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Blueprint
                  </Button>
                </div>
                
                {/* Activity Status Label */}
                <div className="text-center">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${activity.color} bg-opacity-20 text-gray-300`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${activity.color}`} />
                    {activity.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default DashboardRundownGrid
