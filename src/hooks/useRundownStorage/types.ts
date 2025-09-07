
import { RundownItem } from '@/hooks/useRundownItems'
import { Column } from '@/hooks/useUserColumnPreferences'

export interface SavedRundown {
  id: string
  user_id: string
  title: string
  items: RundownItem[]
  columns?: Column[]
  timezone?: string
  start_time?: string
  show_date?: string | null
  icon?: string
  archived?: boolean
  created_at: string
  updated_at: string
  last_updated_by?: string | null
  undo_history?: any[]
  team_id?: string
  visibility?: string
  folder_id?: string | null
  teams?: {
    id: string
    name: string
  } | null
  creator_profile?: {
    full_name: string | null
    email: string
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
