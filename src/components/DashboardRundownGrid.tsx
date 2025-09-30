import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Archive, Users, Plus, RotateCcw, Copy, MoreVertical, Clock, FileText, Play, Calendar, Monitor } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SavedRundown } from '@/hooks/useRundownStorage/types'
import { RundownItem } from '@/hooks/useRundownItems'
import LiveRundownCard from '@/components/LiveRundownCard'
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
import { calculateTotalRuntime } from '@/utils/rundownCalculations'
import { RundownSortingDropdown } from './dashboard/RundownSortingDropdown'
import { useRundownSorting } from '@/hooks/useRundownSorting'

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
  folderType?: 'all' | 'recent' | 'archived' | 'custom'
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
  teamMembers = [],
  folderType
}: DashboardRundownGridProps) => {
  const navigate = useNavigate()
  
  // Use sorting hook
  const { sortBy, setSortBy, sortedRundowns } = useRundownSorting(rundowns)

  const formatDate = (dateString: string) => {
    // Handle empty strings and null values
    if (!dateString || !dateString.trim()) {
      return 'No date';
    }
    // Parse as local date to avoid timezone conversion issues
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString()
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

  // Determine the last editor's display name
  const getLastEditorName = (rundown: SavedRundown) => {
    const editorId = rundown.last_updated_by || rundown.user_id
    if (editorId === currentUserId) return 'You'

    const member = teamMembers.find(m => m.user_id === editorId)
    if (member?.profiles?.full_name) return member.profiles.full_name
    if (member?.profiles?.email) return member.profiles.email

    // If the editor is the original creator and we have their profile
    if (editorId === rundown.user_id && rundown.creator_profile?.full_name) return rundown.creator_profile.full_name
    if (editorId === rundown.user_id && rundown.creator_profile?.email) return rundown.creator_profile.email

    return 'Unknown User'
  }

  const calculateTotalDuration = (items: RundownItem[]) => {
    return calculateTotalRuntime(items)
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
    const timeDiff = now.getTime() - updatedDate.getTime()
    const minutesDiff = timeDiff / (1000 * 60)
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
    const weeksDiff = daysDiff / 7
    const monthsDiff = daysDiff / 30
    const yearsDiff = daysDiff / 365
    
    let timeAgo = ''
    let status = 'older'
    let color = 'bg-gray-500'
    
    if (minutesDiff < 60) {
      const minutes = Math.floor(minutesDiff)
      timeAgo = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      status = 'active'
      color = 'bg-green-500'
    } else if (hoursDiff < 48) {
      const hours = Math.floor(hoursDiff)
      timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`
      status = 'active'
      color = 'bg-green-500'
    } else if (daysDiff < 7) {
      const days = Math.floor(daysDiff)
      timeAgo = `${days} day${days !== 1 ? 's' : ''} ago`
      status = 'week'
      color = 'bg-blue-500'
    } else if (weeksDiff < 4) {
      const weeks = Math.floor(weeksDiff)
      timeAgo = `${weeks} week${weeks !== 1 ? 's' : ''} ago`
      status = 'week'
      color = 'bg-blue-500'
    } else if (monthsDiff < 12) {
      const months = Math.floor(monthsDiff)
      timeAgo = `${months} month${months !== 1 ? 's' : ''} ago`
      status = 'older'
      color = 'bg-gray-500'
    } else {
      const years = Math.floor(yearsDiff)
      timeAgo = `${years} year${years !== 1 ? 's' : ''} ago`
      status = 'older'
      color = 'bg-gray-500'
    }
    
    const editorName = getLastEditorName(rundown)
    return { status, color, label: `Edited ${timeAgo} by ${editorName}` }
  }

  // Handle drag start for rundown cards
  const handleDragStart = (e: React.DragEvent, rundownId: string) => {
    e.dataTransfer.setData('text/rundown-id', rundownId);
    e.dataTransfer.effectAllowed = 'move';
  }

  if (loading && rundowns.length === 0) {
    return (
      <div className="space-y-6">
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <RundownSortingDropdown sortBy={sortBy} onSortChange={setSortBy} />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (sortedRundowns.length === 0 && showEmptyState) {
    return (
      <div className="space-y-6">
        {title && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <RundownSortingDropdown sortBy={sortBy} onSortChange={setSortBy} />
          </div>
        )}
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-300 mb-4">
            {isArchived 
              ? 'No archived rundowns' 
              : folderType === 'recent' 
                ? 'No recent rundowns' 
                : 'No rundowns yet'
            }
          </h3>
          <p className="text-gray-400 mb-6">
            {isArchived 
              ? 'You haven\'t archived any rundowns yet.' 
              : folderType === 'recent'
                ? 'You haven\'t edited any rundowns in the last 7 days.'
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
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <RundownSortingDropdown sortBy={sortBy} onSortChange={setSortBy} />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedRundowns.map((rundown) => {
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
                         <span>{rundown.show_date && rundown.show_date.trim() ? formatDate(rundown.show_date) : formatDate(rundown.updated_at)}</span>
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
                  <div className="space-y-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onOpen(rundown.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Open Rundown
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
                        <span>{rundown.show_date && rundown.show_date.trim() ? formatDate(rundown.show_date) : formatDate(rundown.updated_at)}</span>
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
                <div className="space-y-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onOpen(rundown.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all hover:scale-105"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Open Rundown
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/rundown/${rundown.id}/blueprint`)}
                      className="flex-1 border-gray-600 text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Blueprint
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/rundown/${rundown.id}/teleprompter`, '_blank')}
                      className="flex-1 border-gray-600 text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Prompter
                    </Button>
                  </div>
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
