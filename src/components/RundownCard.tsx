
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, Clock, Trash2, Archive, MoreVertical } from 'lucide-react'
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
  isArchived?: boolean
}

const RundownCard = ({ 
  rundown, 
  onOpen, 
  onDelete, 
  onArchive, 
  onUnarchive, 
  isArchived = false 
}: RundownCardProps) => {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow cursor-pointer relative ${isArchived ? 'opacity-75' : ''}`} 
      onClick={() => onOpen(rundown.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center">
              {isArchived && <Archive className="h-4 w-4 mr-2 text-gray-500" />}
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
              {isArchived ? (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnarchive?.(rundown.id, rundown.title, rundown.items, e)
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => onArchive?.(rundown.id, rundown.title, e)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => onDelete(rundown.id, rundown.title, e)}
                className="text-red-600 focus:text-red-600"
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
  )
}

export default RundownCard
