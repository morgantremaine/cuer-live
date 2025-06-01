import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, Clock, Trash2, Archive, MoreVertical, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { RundownItem } from '@/hooks/useRundownItems'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  archived?: boolean
}

interface RundownCardProps {
  rundown: SavedRundown
  onOpen: (id: string) => void
  onDelete: (id: string, title: string, e: React.MouseEvent) => void
  onArchive?: (id: string, title: string, e: React.MouseEvent) => void
  onUnarchive?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicate?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  isArchived?: boolean
}

const RundownCard = ({ 
  rundown, 
  onOpen, 
  onDelete, 
  onArchive, 
  onUnarchive, 
  onDuplicate,
  isArchived = false 
}: RundownCardProps) => {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow cursor-pointer relative bg-gray-800 border-gray-700 ${isArchived ? 'opacity-75' : ''}`} 
      onClick={() => onOpen(rundown.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center text-white">
              {isArchived && <Archive className="h-4 w-4 mr-2 text-gray-400" />}
              {rundown.title}
            </CardTitle>
            <CardDescription className="flex flex-col gap-1 text-sm text-gray-400">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Created: {format(new Date(rundown.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Modified: {format(new Date(rundown.updated_at), 'MMM d, yyyy')}
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
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = `/blueprint/${rundown.id}`
                }}
                className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
              >
                <Clock className="h-4 w-4 mr-2" />
                Blueprint
              </DropdownMenuItem>
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
              {isArchived ? (
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
              ) : (
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
              )}
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(rundown.id, rundown.title, e)
                }}
                className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 focus:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isArchived ? 'Delete Permanently' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            {rundown.items?.length || 0} items
          </div>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700">
            Open →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default RundownCard
