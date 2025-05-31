
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
      className={`hover:shadow-lg transition-shadow cursor-pointer relative bg-white border-gray-200 ${isArchived ? 'opacity-75' : ''}`} 
      onClick={() => onOpen(rundown.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center text-gray-900">
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
                className="h-8 w-8 relative z-20 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="z-50 bg-white border shadow-lg rounded-md min-w-[160px]"
            >
              {onDuplicate && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(rundown.id, rundown.title, rundown.items, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
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
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
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
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
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
                className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:text-red-600 cursor-pointer"
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
