
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus } from 'lucide-react'
import RundownCard from './RundownCard'
import { RundownItem } from '@/hooks/useRundownItems'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  archived?: boolean
  icon?: string
}

interface RundownGridProps {
  title: string
  rundowns: SavedRundown[]
  loading: boolean
  onCreateNew?: () => void
  onOpen: (id: string) => void
  onDelete: (id: string, title: string, e: React.MouseEvent) => void
  onArchive?: (id: string, title: string, e: React.MouseEvent) => void
  onUnarchive?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicate?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onIconUpdate?: (id: string, iconUrl: string | null) => void
  isArchived?: boolean
  showEmptyState?: boolean
}

const RundownGrid = ({ 
  title, 
  rundowns, 
  loading, 
  onCreateNew, 
  onOpen, 
  onDelete, 
  onArchive, 
  onUnarchive, 
  onDuplicate,
  onIconUpdate,
  isArchived = false,
  showEmptyState = true
}: RundownGridProps) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
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
        ) : rundowns.length === 0 && showEmptyState ? (
          // Empty state
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No rundowns yet</h3>
            <p className="text-gray-400 mb-4">Create your first rundown to get started</p>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Rundown
              </Button>
            )}
          </div>
        ) : (
          // Rundowns list
          rundowns.map((rundown) => (
            <RundownCard
              key={rundown.id}
              rundown={rundown}
              onOpen={onOpen}
              onDelete={onDelete}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDuplicate={onDuplicate}
              onIconUpdate={onIconUpdate}
              isArchived={isArchived}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default RundownGrid
