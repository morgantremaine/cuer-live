import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import RundownCard from './RundownCard'
import { FileText, Plus } from 'lucide-react'
import { RundownItem } from '@/hooks/useRundownItems'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  archived?: boolean
  user_id: string
  team_id: string
}

interface TeamMember {
  id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profiles?: {
    email: string
    full_name: string | null
  }
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
  teamMembers?: TeamMember[] // Add teamMembers prop
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
  currentUserId,
  teamMembers = [] // Default to empty array
}: DashboardRundownGridProps) => {
  const emptyState = (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">No Rundowns Found</CardTitle>
        <CardDescription className="text-gray-400">
          Create a new rundown to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-gray-500">Click the button below to create your first rundown!</p>
        <Button variant="outline" className="bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-700 border-gray-300">
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-gray-400 mt-1">
            {rundowns.length} {rundowns.length === 1 ? 'rundown' : 'rundowns'}
          </p>
        </div>
        {loading && (
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm">Updating...</span>
          </div>
        )}
      </div>

      {showEmptyState && rundowns.length === 0 && !loading ? (
        emptyState
      ) : (
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
              teamMembers={teamMembers} // Pass team members to each card
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardRundownGrid
