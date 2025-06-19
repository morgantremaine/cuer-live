
import React from 'react'
import { Loader2 } from 'lucide-react'
import RundownCard from './RundownCard'
import { RundownItem } from '@/hooks/useRundownItems'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  archived?: boolean
  logo_url?: string | null
  creator_profile?: {
    full_name: string | null
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
  user_id: string
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
  onUpdate?: (rundown: SavedRundown) => void
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
  onUpdate,
  isArchived = false,
  showEmptyState = true,
  currentUserId
}: DashboardRundownGridProps) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (rundowns.length === 0 && showEmptyState) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No rundowns found</div>
          <div className="text-gray-500 text-sm">
            {isArchived ? "No archived rundowns" : "Create your first rundown to get started"}
          </div>
        </div>
      </div>
    )
  }

  if (rundowns.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rundowns.map((rundown) => (
          <div key={rundown.id} onClick={() => onOpen(rundown.id)} className="cursor-pointer">
            <RundownCard
              rundown={rundown}
              onOpen={onOpen}
              onDelete={onDelete}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDuplicate={onDuplicate}
              onUpdate={onUpdate}
              isArchived={isArchived}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default DashboardRundownGrid
