
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useColumnsManager'

export interface SavedRundown {
  id: string
  user_id: string
  title: string
  items: RundownItem[]
  columns?: Column[]
  timezone?: string
  start_time?: string
  icon?: string
  archived?: boolean
  created_at: string
  updated_at: string
  undo_history?: any[]
  team_id?: string
  visibility?: string
  teams?: {
    id: string
    name: string
  } | null
}

// Export alias for compatibility
export type Rundown = SavedRundown

export interface RundownStorage {
  saveRundown: (
    title: string, 
    items: RundownItem[], 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string, 
    icon?: string,
    teamId?: string
  ) => Promise<string>
  loadRundowns: () => Promise<void>
  updateRundown: (
    id: string, 
    title: string, 
    items: RundownItem[], 
    silent?: boolean, 
    archived?: boolean, 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string, 
    icon?: string,
    undoHistory?: any[],
    teamId?: string
  ) => Promise<void>
  deleteRundown: (id: string) => Promise<void>
  savedRundowns: SavedRundown[]
  loading: boolean
}
