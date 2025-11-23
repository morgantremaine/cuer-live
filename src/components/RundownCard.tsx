
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Calendar, Trash2, Archive, MoreVertical, Copy, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { RundownItem } from '@/hooks/useRundownItems'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  show_date?: string | null
  archived?: boolean
}

interface RundownCardProps {
  rundown: SavedRundown
  onOpen: (id: string) => void
  onDelete: (id: string, title: string, e: React.MouseEvent) => void
  onArchive?: (id: string, title: string, e: React.MouseEvent) => void
  onUnarchive?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicate?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicateToTeam?: (id: string, targetTeamId: string, targetTeamName: string, title: string, e: React.MouseEvent) => void
  adminTeams?: Array<{ id: string; name: string }>
  isTeamAdmin?: boolean
  isArchived?: boolean
  userRole?: 'admin' | 'member' | 'manager' | 'teleprompter' | null
}

const RundownCard = ({ 
  rundown, 
  onOpen, 
  onDelete, 
  onArchive, 
  onUnarchive, 
  onDuplicate,
  onDuplicateToTeam,
  adminTeams = [],
  userRole = null,
  isTeamAdmin = false,
  isArchived = false 
}: RundownCardProps) => {
  const navigate = useNavigate();

  const handleBlueprintClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/rundown/${rundown.id}/blueprint`)
  }

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpen(rundown.id)
  }

  // Collapsed view for archived rundowns
  if (isArchived) {
    return (
      <Card className="hover:shadow-lg transition-shadow relative bg-gray-800 border-gray-700 opacity-75">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center text-white">
              <Archive className="h-4 w-4 mr-2 text-gray-400" />
              {rundown.title}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 relative z-20 hover:bg-gray-700 text-gray-400 hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="z-50 bg-gray-800 border-gray-700 shadow-lg rounded-md min-w-[160px]"
              >
                {onDuplicate && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(rundown.id, rundown.title, rundown.items, e)
                    }}
                    className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                )}
                {isTeamAdmin && onDuplicateToTeam && adminTeams.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate to Team...
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-gray-800 border-gray-700">
                        {adminTeams.map((team) => (
                          <DropdownMenuItem
                            key={team.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateToTeam(rundown.id, team.id, team.name, rundown.title, e);
                            }}
                            className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                          >
                            <span className="mr-2">👥</span>
                            {team.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnarchive?.(rundown.id, rundown.title, rundown.items, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(rundown.id, rundown.title, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 focus:text-red-400 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Regular view for active rundowns
  return (
    <Card className="hover:shadow-lg transition-shadow relative bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center text-white">
              {rundown.title}
            </CardTitle>
            <CardDescription className="flex flex-col gap-1 text-sm text-gray-400">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Created: {format(new Date(rundown.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {rundown.show_date && rundown.show_date.trim() ? `Show: ${format(new Date(rundown.show_date), 'MMM d, yyyy')}` : `Modified: ${format(new Date(rundown.updated_at), 'MMM d, yyyy')}`}
              </div>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative z-20 hover:bg-gray-700 text-gray-400 hover:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="z-50 bg-gray-800 border-gray-700 shadow-lg rounded-md min-w-[160px]"
            >
              {onDuplicate && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(rundown.id, rundown.title, rundown.items, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {isTeamAdmin && onDuplicateToTeam && adminTeams.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate to Team...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="bg-gray-800 border-gray-700">
                      {adminTeams.map((team) => (
                        <DropdownMenuItem
                          key={team.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateToTeam(rundown.id, team.id, team.name, rundown.title, e);
                          }}
                          className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                        >
                          <span className="mr-2">👥</span>
                          {team.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive?.(rundown.id, rundown.title, e)
                }}
                className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(rundown.id, rundown.title, e)
                }}
                className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 focus:text-red-400 cursor-pointer"
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
          <div className="flex items-center text-sm text-gray-400">
            {(() => {
              const items = rundown.items || [];
              const headers = items.filter(item => item.type === 'header').length;
              const segments = items.filter(item => item.type !== 'header').length;
              return `${headers} headers, ${segments} segments`;
            })()}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
              onClick={handleBlueprintClick}
            >
              <FileText className="h-4 w-4 mr-1" />
              Blueprint
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={handleOpenClick}
            >
              Open →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RundownCard
