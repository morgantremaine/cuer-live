
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
  profiles?: {
    email: string
    full_name: string | null
  }
}

export interface RundownStorage {
  saveRundown: (
    title: string, 
    items: RundownItem[], 
    columns?: Column[], 
    timezone?: string, 
    startTime?: string, 
    icon?: string
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
    icon?: string
  ) => Promise<void>
  deleteRundown: (id: string) => Promise<void>
  savedRundowns: SavedRundown[]
  loading: boolean
}
