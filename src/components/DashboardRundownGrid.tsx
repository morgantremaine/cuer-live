
import RundownCard from '@/components/RundownCard'
import { RundownItem } from '@/hooks/useRundownItems'

interface CreatorProfile {
  full_name: string | null;
  email: string;
}

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  archived?: boolean
  creator_profile?: CreatorProfile | null
}

interface DashboardRundownGridProps {
  title: string
  rundowns: SavedRundown[]
  loading: boolean
  onOpen: (id: string) => void
  onDelete: (id: string, title: string, e: React.MouseEvent) => void
  onArchive?: (id: string, title: string, e: React.MouseEvent) => void
  onUnarchive?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicate?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  isArchived?: boolean
  showEmptyState?: boolean
  currentUserId?: string
}

const DashboardRundownGrid = ({
  title,
  rundowns,
  loading,
  onOpen,
  onDelete,
  onArchive,
  onUnarchive,
  onDuplicate,
  isArchived = false,
  showEmptyState = true,
  currentUserId
}: DashboardRundownGridProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
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
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">
            {isArchived ? 'No archived rundowns found' : 'No rundowns found'}
          </div>
          {!isArchived && (
            <p className="text-gray-500">
              Create your first rundown to get started
            </p>
          )}
        </div>
      </div>
    )
  }

  if (rundowns.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rundowns.map((rundown) => (
          <RundownCard
            key={rundown.id}
            rundown={rundown}
            onOpen={onOpen}
            onDelete={onDelete}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDuplicate={onDuplicate}
            isArchived={isArchived}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}

export default DashboardRundownGrid
